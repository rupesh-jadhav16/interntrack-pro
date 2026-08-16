"""T&P Cell (admin) endpoints: college-wide stats, verification queues,
student/faculty/internship management, rankings, analytics, announcements."""
import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..config import APPLICATION_STAGES, REWARD_DEFAULTS
from ..database import get_db
from ..models import (
    Announcement,
    Application,
    Attendance,
    Certificate,
    Company,
    Internship,
    ReportDaily,
    ReportWeekly,
    RewardConfig,
    Tracker,
    User,
)
from ..security import (
    company_payload,
    hash_password,
    log_action,
    notify,
    public_user,
    require_admin,
)

router = APIRouter(prefix="/api", tags=["admin"])


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get("/admin/dashboard")
def admin_dashboard(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student", User.is_active.is_(True)).count()
    faculty = db.query(User).filter(User.role == "faculty", User.is_active.is_(True)).count()
    companies = db.query(User).filter(User.role == "company").count()
    verified_companies = db.query(User).filter(User.role == "company", User.verified.is_(True)).count()
    internships = db.query(Internship).filter(Internship.status == "open").count()
    applications = db.query(Application).count()
    active_trackers = db.query(Tracker).filter(Tracker.status == "active").count()
    pending_certs = db.query(Certificate).filter(Certificate.status == "pending").count()
    pending_companies = db.query(Company).filter(Company.status == "pending").count()
    pending_reports = (
        db.query(ReportDaily).filter(ReportDaily.status == "pending").count()
        + db.query(ReportWeekly).filter(ReportWeekly.status == "pending").count()
    )
    attendance_today = db.query(Attendance).filter(Attendance.day == date.today()).count()

    # joined / completed this month
    month_start = date.today().replace(day=1)
    joined = (
        db.query(Application)
        .filter(Application.status == "joined", Application.updated_at >= datetime.combine(month_start, datetime.min.time()))
        .count()
    )
    return {
        "stats": {
            "students": students,
            "faculty": faculty,
            "companies": companies,
            "verified_companies": verified_companies,
            "internships": internships,
            "applications": applications,
            "active_trackers": active_trackers,
            "pending_certificates": pending_certs,
            "pending_companies": pending_companies,
            "pending_reports": pending_reports,
            "attendance_today": attendance_today,
            "joined_this_month": joined,
        },
        "user": public_user(user),
    }


# ---------------------------------------------------------------------------
# People management
# ---------------------------------------------------------------------------
@router.get("/admin/students")
def all_students(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    students = (
        db.query(User)
        .filter(User.role == "student")
        .order_by(User.created_at.desc())
        .all()
    )
    items = []
    for s in students:
        tracker = db.query(Tracker).filter(Tracker.student_id == s.id, Tracker.status == "active").first()
        mentor = db.query(User).filter(User.id == s.mentor_id).first() if s.mentor_id else None
        items.append(
            {
                "student": public_user(s),
                "current_internship": tracker.company if tracker else None,
                "mentor": mentor.name if mentor else None,
            }
        )
    return {"items": items}


@router.post("/admin/students/{student_id}/mentor")
def assign_mentor(student_id: int, payload: dict, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    faculty_id = payload.get("faculty_id")
    if faculty_id:
        faculty = db.query(User).filter(User.id == int(faculty_id), User.role == "faculty").first()
        if not faculty:
            raise HTTPException(status_code=400, detail="Faculty not found")
        student.mentor_id = faculty.id
    else:
        student.mentor_id = None
    db.commit()
    if faculty_id:
        notify(db, int(faculty_id), "Student assigned", f"{student.name} was assigned to you as a mentee.", "info")
    log_action(db, user, "mentor_assigned", f"Mentor set for {student.name}")
    return {"ok": True}


@router.get("/admin/faculty")
def all_faculty(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    faculty = (
        db.query(User)
        .filter(User.role == "faculty")
        .order_by(User.name)
        .all()
    )
    items = []
    for f in faculty:
        count = db.query(User).filter(User.mentor_id == f.id).count()
        items.append({**public_user(f), "mentees": count, "department": f.faculty_department})
    return {"items": items}


class FacultyIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)
    department: str = ""
    designation: str = ""


@router.post("/admin/faculty")
def add_faculty(data: FacultyIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    f = User(
        role="faculty",
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        faculty_department=data.department or None,
        faculty_designation=data.designation or None,
    )
    db.add(f)
    db.commit()
    log_action(db, user, "faculty_added", f"Added faculty {f.name}")
    return {"ok": True}


@router.post("/admin/students/{student_id}/toggle")
def toggle_student(student_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    s = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    s.is_active = not s.is_active
    db.commit()
    return {"ok": True, "is_active": s.is_active}


# ---------------------------------------------------------------------------
# Company verification
# ---------------------------------------------------------------------------
@router.get("/admin/companies")
def company_queue(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    items = []
    for c in companies:
        owner = db.query(User).filter(User.id == c.user_id).first()
        items.append(
            {
                **company_payload(c),
                "owner_email": owner.email if owner else None,
                "internship_count": db.query(Internship).filter(Internship.company_id == c.id).count(),
            }
        )
    return {"items": items}


class VerifyIn(BaseModel):
    approve: bool
    note: str = ""


@router.post("/admin/companies/{company_id}/verify")
def verify_company(company_id: int, data: VerifyIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    owner = db.query(User).filter(User.id == c.user_id).first()
    if data.approve:
        c.status = "verified"
        c.reviewed_by = user.id
        c.reviewed_at = datetime.utcnow()
        if owner:
            owner.verified = True
            owner.verification_status = "verified"
            notify(db, owner.id, "Company verified 🎉", "Your company is now verified. Students can see the verified badge on your internships.", "success")
    else:
        c.status = "rejected"
        c.reviewed_by = user.id
        c.reviewed_at = datetime.utcnow()
        if owner:
            owner.verified = False
            owner.verification_status = "rejected"
            owner.verification_note = data.note or None
            notify(db, owner.id, "Verification needs changes", f"Your company verification was rejected: {data.note or 'Please re-submit with correct details'}", "warning")
    db.commit()
    log_action(db, user, "company_verified" if data.approve else "company_rejected", f"{c.name}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Certificate review
# ---------------------------------------------------------------------------
@router.get("/admin/certificates")
def certificate_queue(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    certs = (
        db.query(Certificate)
        .filter(Certificate.status == "pending")
        .order_by(Certificate.created_at.asc())
        .all()
    )
    items = []
    for c in certs:
        student = db.query(User).filter(User.id == c.student_id).first()
        items.append(
            {
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "company": c.company,
                "issued_by": c.issued_by,
                "doc_path": c.doc_path,
                "student": public_user(student) if student else None,
            }
        )
    return {"items": items}


class CertReviewIn(BaseModel):
    approve: bool
    note: str = ""


@router.post("/admin/certificates/{cert_id}/review")
def review_certificate(cert_id: int, data: CertReviewIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certificate not found")
    c.status = "approved" if data.approve else "rejected"
    c.review_note = data.note or None
    c.reviewed_by = user.id
    if data.approve:
        c.authenticity_score = min(100, 88 + len(c.company or "") * 2)
        from ..security import add_points
        from ..config import REWARD_DEFAULTS

        cfg = db.query(RewardConfig).filter(RewardConfig.key == "certificate_verified").first()
        pts = cfg.value if cfg else REWARD_DEFAULTS["certificate_verified"]
        student = db.query(User).filter(User.id == c.student_id).first()
        add_points(db, student, pts, "Certificate verified", badge="certificate")
        notify(db, c.student_id, "Certificate verified ✅", f"Your certificate '{c.title}' passed verification. +{pts} points.", "success")
    else:
        notify(db, c.student_id, "Certificate rejected", f"Your certificate '{c.title}' was rejected: {data.note or 'No reason given'}", "warning")
    db.commit()
    log_action(db, user, "certificate_reviewed", f"'{c.title}' {'approved' if data.approve else 'rejected'}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Internship & application management
# ---------------------------------------------------------------------------
@router.get("/admin/internships")
def all_internships(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Internship).order_by(Internship.posted_at.desc()).all()
    from ..security import internship_payload

    return {
        "items": [
            internship_payload(i, applied=False, saved=False)
            for i in rows
        ]
    }


@router.post("/admin/internships/{internship_id}/close")
def close_internship(internship_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Internship not found")
    i.status = "closed"
    db.commit()
    notify(db, i.company.user_id, "Internship closed", f"'{i.title}' was closed by the T&P cell.", "warning")
    log_action(db, user, "internship_closed", f"Closed '{i.title}'")
    return {"ok": True}


@router.get("/admin/applications")
def all_applications(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Application).order_by(Application.applied_at.desc()).limit(200).all()
    from ..security import internship_payload

    items = []
    for a in rows:
        student = db.query(User).filter(User.id == a.student_id).first()
        items.append(
            {
                "id": a.id,
                "status": a.status,
                "applied_at": a.applied_at.isoformat(),
                "student": public_user(student) if student else None,
                "internship": internship_payload(a.internship),
            }
        )
    return {"items": items}


@router.post("/admin/applications/{app_id}/stage")
def set_application_stage(app_id: int, payload: dict, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    stage = payload.get("stage")
    if stage not in APPLICATION_STAGES + ["rejected"]:
        raise HTTPException(status_code=400, detail="Invalid stage")
    a.status = stage
    hist = json.loads(a.stage_history) if a.stage_history else []
    hist.append({"stage": stage, "at": datetime.utcnow().isoformat()})
    a.stage_history = json.dumps(hist)
    db.commit()
    student = db.query(User).filter(User.id == a.student_id).first()
    notify(db, a.student_id, f"Application moved to {stage.replace('_', ' ')}", f"Your application for {a.internship.title} is now '{stage.replace('_', ' ')}'.", "info")
    log_action(db, user, "application_stage", f"{student.name} → {stage} for {a.internship.title}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Rankings, rewards config, announcements, analytics
# ---------------------------------------------------------------------------
@router.get("/admin/rankings")
def rankings(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    students = (
        db.query(User)
        .filter(User.role == "student", User.is_active.is_(True))
        .order_by(User.points.desc())
        .all()
    )
    from ..security import internship_payload

    return {
        "rows": [
            {
                "rank": i + 1,
                "name": s.name,
                "department": s.department,
                "branch": s.branch,
                "points": s.points or 0,
                "streak": s.streak or 0,
            }
            for i, s in enumerate(students[:100])
        ]
    }


@router.get("/admin/reward-config")
def get_reward_config(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    configs = db.query(RewardConfig).all()
    merged = dict(REWARD_DEFAULTS)
    for c in configs:
        merged[c.key] = c.value
    return {"config": merged}


@router.put("/admin/reward-config")
def update_reward_config(payload: dict, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    for key, value in payload.items():
        if key in REWARD_DEFAULTS and isinstance(value, int) and value >= 0:
            cfg = db.query(RewardConfig).filter(RewardConfig.key == key).first()
            if cfg:
                cfg.value = value
            else:
                db.add(RewardConfig(key=key, label=key.replace("_", " ").title(), value=value))
    db.commit()
    log_action(db, user, "reward_config", "Updated reward point values")
    return {"ok": True}


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=3)
    message: str = Field(min_length=5)
    audience: str = "all"


@router.post("/admin/announcements")
def create_announcement(data: AnnouncementIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    a = Announcement(title=data.title, message=data.message, audience=data.audience, created_by=user.id)
    db.add(a)
    db.commit()
    # notify all users of matching audience
    q = db.query(User).filter(User.is_active.is_(True))
    if data.audience == "students":
        q = q.filter(User.role == "student")
    elif data.audience == "faculty":
        q = q.filter(User.role.in_(["faculty", "admin"]))
    elif data.audience == "companies":
        q = q.filter(User.role == "company")
    for u in q.all():
        notify(db, u.id, data.title, data.message, "system")
    log_action(db, user, "announcement", data.title)
    return {"ok": True}


@router.get("/admin/analytics")
def analytics(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    today = date.today()
    # applications per day (last 14 days)
    app_series = []
    att_series = []
    for d in range(13, -1, -1):
        day = today - timedelta(days=d)
        apps = (
            db.query(Application)
            .filter(Application.applied_at >= datetime.combine(day, datetime.min.time()),
                    Application.applied_at <= datetime.combine(day, datetime.max.time()))
            .count()
        )
        att = db.query(Attendance).filter(Attendance.day == day).count()
        app_series.append({"label": day.strftime("%d %b"), "applications": apps})
        att_series.append({"label": day.strftime("%d %b"), "attendance": att})

    # application status distribution
    status_counts = {}
    for row in db.query(Application.status).all():
        s = row[0] or "applied"
        status_counts[s] = status_counts.get(s, 0) + 1

    # domain distribution
    domain_counts = {}
    for row in db.query(Internship.domain).filter(Internship.domain.isnot(None)).all():
        d = row[0]
        domain_counts[d] = domain_counts.get(d, 0) + 1

    # company distribution of internships
    comp_counts = {}
    for i in db.query(Internship).all():
        name = i.company.name if i.company else "Unknown"
        comp_counts[name] = comp_counts.get(name, 0) + 1

    return {
        "applications_series": app_series,
        "attendance_series": att_series,
        "status_distribution": status_counts,
        "domain_distribution": domain_counts,
        "company_distribution": comp_counts,
    }

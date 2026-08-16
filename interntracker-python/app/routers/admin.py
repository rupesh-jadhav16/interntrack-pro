"""T&P Cell / Admin endpoints."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (ActivityLog, Announcement, Application, Attendance, Certificate, CompanyProfile,
                      DailyReport, Enrollment, Internship, Notification, StudentProfile, User, WeeklyReport)
from ..security import get_current_user, log_activity, notify, require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_role("admin")


@router.get("/dashboard")
def dashboard(user: User = Depends(admin_only), db: Session = Depends(get_db)):
    students = db.query(StudentProfile).count()
    faculty = db.query(User).filter_by(role="faculty").count()
    companies = db.query(CompanyProfile).count()
    verified = db.query(CompanyProfile).filter_by(verification_status="verified").count()
    pending_verification = db.query(CompanyProfile).filter_by(verification_status="pending").count()
    internships = db.query(Internship).count()
    open_internships = db.query(Internship).filter_by(status="open").count()
    applications = db.query(Application).count()
    active = db.query(Enrollment).filter_by(status="active").count()
    completed = db.query(Enrollment).filter_by(status="completed").count()
    certs_pending = db.query(Certificate).filter(Certificate.status != "verified").count()
    at_risk = sum(1 for sp in db.query(StudentProfile).all() if sp.current_streak == 0 and sp.last_report_date)
    att = db.query(Attendance).all()
    present = sum(1 for a in att if a.status == "present")
    today = date.today()
    reports_today = db.query(DailyReport).filter_by(date=today).count()
    return {
        "stats": {"students": students, "faculty": faculty, "companies": companies, "verified_companies": verified,
                  "pending_verification": pending_verification, "internships": internships, "open_internships": open_internships,
                  "applications": applications, "active_internships": active, "completed_internships": completed,
                  "certificates_pending": certs_pending, "students_at_risk": at_risk, "reports_today": reports_today,
                  "attendance_pct": round(present / max(len(att), 1) * 100)},
        "recent_activity": [{"id": l.id, "action": l.action, "detail": l.detail[:120],
                             "created_at": l.created_at.isoformat() if l.created_at else None}
                            for l in db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(12).all()],
        "applications_by_status": [
            {"status": s, "count": db.query(Application).filter_by(status=s).count()}
            for s in ("applied", "under_review", "shortlisted", "interview", "selected", "rejected", "joined", "completed")
            if db.query(Application).filter_by(status=s).count()],
    }


@router.get("/students")
def students(q: str = "", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(StudentProfile, User).join(User, User.id == StudentProfile.user_id)
    if q:
        query = query.filter(User.name.ilike(f"%{q}%") | StudentProfile.department.ilike(f"%{q}%"))
    rows = query.all()
    out = []
    for sp, u in rows:
        enr = db.query(Enrollment).filter_by(student_id=sp.user_id, status="active").first()
        out.append({"id": sp.user_id, "name": u.name, "email": u.email, "department": sp.department,
                    "branch": sp.branch, "year": sp.year, "cgpa": sp.cgpa, "points": sp.points,
                    "streak": sp.current_streak, "mentor_id": sp.mentor_id,
                    "mentor": db.get(User, sp.mentor_id).name if sp.mentor_id and db.get(User, sp.mentor_id) else None,
                    "active_internship": enr.company_name if enr else None})
    return {"items": out}


class MentorIn(BaseModel):
    mentor_id: int | None = None


@router.patch("/students/{sid}/mentor")
def assign_mentor(sid: int, data: MentorIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    sp = db.query(StudentProfile).filter_by(user_id=sid).first()
    if sp is None:
        raise HTTPException(404, "Student not found")
    sp.mentor_id = data.mentor_id
    db.commit()
    if data.mentor_id:
        notify(db, data.mentor_id, "Student assigned", f"{db.get(User, sid).name} is now assigned to you", "info")
        notify(db, sid, "Mentor assigned", "A faculty mentor has been assigned to you", "info")
        db.commit()
    log_activity(db, user.id, "admin.assign_mentor", f"student {sid} -> mentor {data.mentor_id}")
    db.commit()
    return {"ok": True}


@router.get("/faculty")
def faculty(user: User = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(User).filter_by(role="faculty").all()
    return {"items": [{"id": u.id, "name": u.name, "email": u.email,
                       "students": db.query(StudentProfile).filter_by(mentor_id=u.id).count()} for u in rows]}


@router.get("/companies")
def companies(status: str = "", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(CompanyProfile, User).join(User, User.id == CompanyProfile.user_id)
    if status:
        query = query.filter(CompanyProfile.verification_status == status)
    return {"items": [{"id": cp.user_id, "name": cp.name, "official_email": cp.official_email,
                       "website": cp.website, "industry": cp.industry, "location": cp.location,
                       "verification_status": cp.verification_status, "docs": cp.docs or [],
                       "description": cp.description[:200], "registration_info": cp.registration_info,
                       "internships": db.query(Internship).filter_by(company_id=cp.user_id).count()}
                      for cp, u in query.all()]}


class VerifyIn(BaseModel):
    action: str  # verify | reject | suspend | pending


@router.post("/companies/{cid}/verify")
def verify_company(cid: int, data: VerifyIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    cp = db.query(CompanyProfile).filter_by(user_id=cid).first()
    if cp is None:
        raise HTTPException(404, "Company not found")
    if data.action not in ("verify", "reject", "suspend", "pending"):
        raise HTTPException(400, "Invalid action")
    cp.verification_status = data.action
    if data.action == "verify":
        cp.verified_at = datetime.utcnow()
        cp.verified_by = user.id
        notify(db, cid, "Company verified ✓", f"{cp.name} is now a Verified Company on InternTracker.", "success")
    else:
        notify(db, cid, f"Verification {data.action}", f"Your company profile status is now '{data.action}'.", "info")
    db.commit()
    log_activity(db, user.id, "admin.verify_company", f"{cp.name} -> {data.action}")
    db.commit()
    return {"ok": True}


@router.get("/certificates")
def certificates(status: str = "", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(Certificate).order_by(Certificate.created_at.desc())
    if status:
        query = query.filter(Certificate.status == status)
    return {"items": [{"id": c.id, "student": db.get(User, c.student_id).name, "student_id": c.student_id,
                       "title": c.title, "cert_type": c.cert_type, "company_name": c.company_name,
                       "file_url": c.file_url, "score": c.score, "status": c.status,
                       "indicators": c.indicators or [],
                       "created_at": c.created_at.isoformat() if c.created_at else None} for c in query.all()]}


class CertReviewIn(BaseModel):
    status: str  # verified | review | suspicious
    note: str = ""


@router.post("/certificates/{cid}/review")
def review_certificate(cid: int, data: CertReviewIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    c = db.get(Certificate, cid)
    if c is None:
        raise HTTPException(404, "Certificate not found")
    c.status = data.status
    c.reviewed_by = user.id
    c.reviewed_at = datetime.utcnow()
    db.commit()
    notify(db, c.student_id, f"Certificate review: {data.status}",
           f"'{c.title}' was reviewed by the T&P Cell" + (f" ({data.note})" if data.note else ""), "certificate")
    db.commit()
    log_activity(db, user.id, "admin.review_certificate", f"cert {cid} -> {data.status}")
    db.commit()
    return {"ok": True}


@router.get("/internships")
def internships(status: str = "", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(Internship).order_by(Internship.posted_at.desc())
    if status:
        query = query.filter(Internship.status == status)
    out = []
    for i in query.limit(100).all():
        cp = db.query(CompanyProfile).filter_by(user_id=i.company_id).first()
        out.append({"id": i.id, "title": i.title, "company": cp.name if cp else "",
                    "verified": bool(cp and cp.verification_status == "verified"),
                    "mode": i.mode, "location": i.location, "stipend": i.stipend, "status": i.status,
                    "deadline": i.deadline.isoformat() if i.deadline else None,
                    "applications": db.query(Application).filter_by(internship_id=i.id).count()})
    return {"items": out}


@router.post("/internships/{iid}/status")
def set_internship_status(iid: int, data: VerifyIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None:
        raise HTTPException(404, "Internship not found")
    i.status = data.action
    db.commit()
    log_activity(db, user.id, "admin.internship_status", f"internship {iid} -> {data.action}")
    db.commit()
    return {"ok": True}


@router.get("/applications")
def applications(status: str = "", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    query = db.query(Application).order_by(Application.applied_at.desc())
    if status:
        query = query.filter(Application.status == status)
    out = []
    for a in query.limit(100).all():
        i = a.internship
        cp = db.query(CompanyProfile).filter_by(user_id=i.company_id).first() if i else None
        out.append({"id": a.id, "student": db.get(User, a.student_id).name, "student_id": a.student_id,
                    "title": i.title if i else "", "company": cp.name if cp else "",
                    "status": a.status, "applied_at": a.applied_at.isoformat() if a.applied_at else None})
    return {"items": out}


@router.post("/applications/{aid}/status")
def set_application_status(aid: int, data: VerifyIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    a = db.get(Application, aid)
    if a is None:
        raise HTTPException(404, "Application not found")
    a.status = data.action
    db.commit()
    notify(db, a.student_id, f"Application status: {data.action}",
           f"Your application for '{a.internship.title if a.internship else ''}' is now {data.action}", "application")
    db.commit()
    log_activity(db, user.id, "admin.application_status", f"app {aid} -> {data.action}")
    db.commit()
    return {"ok": True}


@router.get("/rankings")
def rankings(department: str = "", period: str = "all", user: User = Depends(admin_only), db: Session = Depends(get_db)):
    q = db.query(StudentProfile, User).join(User, User.id == StudentProfile.user_id)
    if department:
        q = q.filter(StudentProfile.department == department)
    rows = q.order_by(StudentProfile.points.desc()).all()
    return {"items": [{"rank": i, "student_id": sp.user_id, "name": u.name, "department": sp.department,
                       "branch": sp.branch, "year": sp.year, "points": sp.points, "streak": sp.current_streak,
                       "cgpa": sp.cgpa, "badges": len(sp.badges or [])}
                      for i, (sp, u) in enumerate(rows, start=1)]}


class RewardsIn(BaseModel):
    daily: int = 10
    weekly: int = 50
    perfect_week: int = 100
    completion: int = 500


@router.patch("/rewards")
def update_rewards(data: RewardsIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    db.query(ActivityLog).filter(ActivityLog.action == "config.rewards").delete()
    db.add(ActivityLog(actor_id=user.id, action="config.rewards",
                       detail=f"daily={data.daily} weekly={data.weekly} perfect_week={data.perfect_week} completion={data.completion}"))
    db.commit()
    return {"ok": True, "saved": {"daily": data.daily, "weekly": data.weekly,
                                  "perfect_week": data.perfect_week, "completion": data.completion}}


@router.get("/analytics")
def analytics(user: User = Depends(admin_only), db: Session = Depends(get_db)):
    # department-wise student + internship stats
    depts = {}
    for sp in db.query(StudentProfile).all():
        d = depts.setdefault(sp.department or "Other", {"students": 0, "points": 0, "interns": 0})
        d["students"] += 1
        d["points"] += sp.points
        if db.query(Enrollment).filter_by(student_id=sp.user_id, status="active").first():
            d["interns"] += 1
    # applications trend (last 8 weeks)
    weeks = []
    today = date.today()
    for w in range(8):
        start = today - timedelta(days=today.weekday() + w * 7)
        weeks.append({"week": start.isoformat(),
                      "applications": db.query(Application).filter(Application.applied_at >= datetime.combine(start, datetime.min.time()),
                                                                    Application.applied_at < datetime.combine(start + timedelta(days=7), datetime.min.time())).count(),
                      "reports": db.query(DailyReport).filter(DailyReport.date >= start,
                                                              DailyReport.date < start + timedelta(days=7)).count()})
    weeks.reverse()
    # companies by status
    comps = [{"status": s, "count": db.query(CompanyProfile).filter_by(verification_status=s).count()}
             for s in ("pending", "verified", "rejected", "suspended")]
    return {"departments": depts, "weeks": weeks, "companies": comps,
            "attendance": {"present": db.query(Attendance).filter_by(status="present").count(),
                           "absent": db.query(Attendance).filter_by(status="absent").count(),
                           "leave": db.query(Attendance).filter_by(status="leave").count(),
                           "holiday": db.query(Attendance).filter_by(status="holiday").count()}}


class AnnouncementIn(BaseModel):
    title: str
    body: str = ""


@router.post("/announcements")
def create_announcement(data: AnnouncementIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    a = Announcement(title=data.title, body=data.body, created_by=user.id)
    db.add(a)
    db.flush()
    for u in db.query(User).filter(User.role.in_(("student", "faculty", "company"))).all():
        notify(db, u.id, data.title, data.body, "announcement")
    db.commit()
    log_activity(db, user.id, "admin.announcement", data.title[:80])
    db.commit()
    return {"ok": True, "id": a.id}


@router.get("/logs")
def logs(limit: int = 50, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return {"items": [{"id": l.id, "action": l.action, "detail": l.detail,
                       "actor": db.get(User, l.actor_id).name if l.actor_id and db.get(User, l.actor_id) else "system",
                       "created_at": l.created_at.isoformat() if l.created_at else None} for l in rows]}

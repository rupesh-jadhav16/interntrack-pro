"""Student endpoints: dashboard, explorer, applications, tracker, reports,
attendance, deadlines, certificates, rewards."""
import math
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import REWARD_DEFAULTS
from ..database import get_db
from ..models import (
    Application,
    Attendance,
    Certificate,
    Company,
    Internship,
    Notification,
    ReportDaily,
    ReportWeekly,
    Reward,
    RewardConfig,
    SavedInternship,
    StudentProfile,
    Tracker,
    User,
)
from ..security import (
    add_points,
    get_current_user,
    internship_payload,
    log_action,
    notify,
    public_user,
    require_student,
    update_streak,
)

router = APIRouter(prefix="/api", tags=["student"])

PROFILE_FIELDS = ["department", "branch", "year", "cgpa", "phone", "location", "skills"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _haversine(lat1, lng1, lat2, lng2):
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _profile_completion(p) -> int:
    filled = sum(1 for f in PROFILE_FIELDS if getattr(p, f))
    return int(filled / len(PROFILE_FIELDS) * 100)


def _today():
    return date.today()


def _week_label(d: date) -> str:
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _reward_value(db: Session, key: str) -> int:
    cfg = db.query(RewardConfig).filter(RewardConfig.key == key).first()
    if cfg:
        return cfg.value
    return REWARD_DEFAULTS.get(key, 0)


def _application_summary(a: Application):
    return {
        "id": a.id,
        "status": a.status,
        "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        "cover_letter": a.cover_letter,
        "stage_history": a.stage_history,
        "internship": internship_payload(a.internship),
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get("/student/dashboard")
def student_dashboard(user: User = Depends(require_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    completion = _profile_completion(profile) if profile else 0

    tracker = (
        db.query(Tracker)
        .filter(Tracker.student_id == user.id, Tracker.status == "active")
        .order_by(Tracker.created_at.desc())
        .first()
    )
    applications = (
        db.query(Application).filter(Application.student_id == user.id).order_by(Application.applied_at.desc()).all()
    )
    app_status = None
    if applications:
        # most recent non-final status
        order = {"applied": 0, "under_review": 1, "shortlisted": 2, "interview": 3, "selected": 4, "joined": 5, "completed": 6}
        active = [a for a in applications if a.status in order and a.status not in ("rejected",)]
        if active:
            app_status = max(active, key=lambda a: order.get(a.status, 0)).status

    saved_count = db.query(SavedInternship).filter(SavedInternship.student_id == user.id).count()

    # attendance %
    month_start = _today().replace(day=1)
    att_rows = (
        db.query(Attendance)
        .filter(Attendance.student_id == user.id, Attendance.day >= month_start, Attendance.day <= _today())
        .all()
    )
    present = sum(1 for r in att_rows if r.status == "present")
    attendance_pct = round(present / len(att_rows) * 100) if att_rows else 0

    # weekly progress: reports submitted this week
    week = _week_label(_today())
    weekly_done = (
        db.query(ReportWeekly).filter(ReportWeekly.student_id == user.id, ReportWeekly.week_label == week).first()
    )
    daily_today = (
        db.query(ReportDaily)
        .filter(ReportDaily.student_id == user.id, ReportDaily.report_date == _today())
        .first()
    )

    # deadlines: upcoming internship deadlines for applied + saved
    deadline_rows = []
    seen = set()
    for a in applications:
        if a.internship.deadline and a.internship.deadline >= _today() and a.internship.id not in seen:
            seen.add(a.internship.id)
            deadline_rows.append(
                {"internship_id": a.internship.id, "title": a.internship.title, "company": a.internship.company.name,
                 "deadline": a.internship.deadline.isoformat()}
            )
    for s in db.query(SavedInternship).filter(SavedInternship.student_id == user.id).all():
        i = s.internship
        if i.deadline and i.deadline >= _today() and i.id not in seen:
            seen.add(i.id)
            deadline_rows.append(
                {"internship_id": i.id, "title": i.title, "company": i.company.name,
                 "deadline": i.deadline.isoformat()}
            )
    deadline_rows.sort(key=lambda d: d["deadline"])

    unread = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read.is_(False))
        .count()
    )

    # rank
    rank = (
        db.query(User).filter(User.role == "student", User.points > (user.points or 0)).count() + 1
    )

    return {
        "user": public_user(user),
        "profile_completion": completion,
        "tracker": tracker_payload(tracker) if tracker else None,
        "internship_status": app_status,
        "streak": user.streak or 0,
        "points": user.points or 0,
        "rank": rank,
        "attendance_pct": attendance_pct,
        "applications_count": len(applications),
        "saved_count": saved_count,
        "upcoming_deadlines": deadline_rows[:5],
        "weekly_done": bool(weekly_done),
        "daily_done": bool(daily_today),
        "unread_notifications": unread,
    }


def tracker_payload(t: Tracker) -> dict:
    return {
        "id": t.id,
        "type": t.type,
        "company": t.company,
        "role": t.role,
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "end_date": t.end_date.isoformat() if t.end_date else None,
        "mentor_name": t.mentor_name,
        "mode": t.mode,
        "location": t.location,
        "status": t.status,
        "offer_letter": t.offer_letter_path,
    }


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
@router.get("/student/profile")
def get_profile(user: User = Depends(require_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return {
        "user": public_user(user),
        "profile": {
            "department": profile.department,
            "branch": profile.branch,
            "year": profile.year,
            "cgpa": profile.cgpa,
            "phone": profile.phone,
            "location": profile.location,
            "skills": (profile.skills or "").split(",") if profile.skills else [],
            "bio": profile.bio,
            "linkedin": profile.linkedin,
            "github": profile.github,
            "resume_path": profile.resume_path,
            "completion": _profile_completion(profile),
        },
    }


class ProfileUpdate(BaseModel):
    department: str = ""
    branch: str = ""
    year: str = ""
    cgpa: float | None = None
    phone: str = ""
    location: str = ""
    skills: list[str] = []
    bio: str = ""
    linkedin: str = ""
    github: str = ""
    resume_path: str = ""


@router.put("/student/profile")
def update_profile(data: ProfileUpdate, user: User = Depends(require_student), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
    profile.department = data.department or None
    profile.branch = data.branch or None
    profile.year = data.year or None
    profile.cgpa = data.cgpa
    profile.phone = data.phone or None
    profile.location = data.location or None
    profile.skills = ",".join(data.skills) if data.skills else None
    profile.bio = data.bio or None
    profile.linkedin = data.linkedin or None
    profile.github = data.github or None
    profile.resume_path = data.resume_path or None

    user.department = profile.department
    user.branch = profile.branch
    user.year = profile.year
    user.cgpa = profile.cgpa
    user.phone = profile.phone
    user.location = profile.location
    user.resume_path = profile.resume_path
    user.profile_completed = bool(profile.department and profile.branch and profile.cgpa)
    db.commit()
    log_action(db, user, "profile_updated", "Updated student profile")
    return {"ok": True, "completion": _profile_completion(profile)}


# ---------------------------------------------------------------------------
# Internship explorer
# ---------------------------------------------------------------------------
@router.get("/internships")
def explore_internships(
    q: str = "",
    location: str = "",
    mode: str = "",
    paid: str = "",  # "paid" | "unpaid"
    min_stipend: int = 0,
    duration: int = 0,  # max months
    domain: str = "",
    skill: str = "",
    company: str = "",
    sort: str = "recent",  # recent|deadline|stipend
    lat: float | None = None,
    lng: float | None = None,
    max_distance: float | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Internship).filter(Internship.status == "open")
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Internship.title.ilike(like)) | (Internship.description.ilike(like)) | (Internship.skills.ilike(like))
        )
    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
    if mode:
        query = query.filter(Internship.mode == mode)
    if paid == "paid":
        query = query.filter(Internship.paid.is_(True))
    elif paid == "unpaid":
        query = query.filter(Internship.paid.is_(False))
    if min_stipend > 0:
        query = query.filter(Internship.stipend.ilike(f"%{min_stipend}%"))
    if duration > 0:
        query = query.filter(Internship.duration_months <= duration)
    if domain:
        query = query.filter(Internship.domain == domain)
    if skill:
        query = query.filter(Internship.skills.ilike(f"%{skill}%"))
    if company:
        query = query.join(Company).filter(Company.name.ilike(f"%{company}%"))

    internships = query.all()

    # distance filter (haversine against internship coords, fallback city text match)
    if max_distance and (lat is not None and lng is not None):
        internships = [
            i
            for i in internships
            if (d := _haversine(lat, lng, i.latitude, i.longitude)) is not None and d <= max_distance
        ]

    # student-specific flags
    applied_ids = {a.internship_id for a in db.query(Application).filter(Application.student_id == user.id).all()}
    saved_ids = {s.internship_id for s in db.query(SavedInternship).filter(SavedInternship.student_id == user.id).all()}

    results = []
    for i in internships:
        dist = _haversine(lat, lng, i.latitude, i.longitude) if (lat is not None and lng is not None) else None
        results.append(internship_payload(i, applied=i.id in applied_ids, saved=i.id in saved_ids, distance=dist))

    if sort == "deadline":
        results.sort(key=lambda r: r["deadline"] or "9999-12-31")
    elif sort == "stipend":
        results.sort(key=lambda r: -int("".join(c for c in (r["stipend"] or "0") if c.isdigit()) or 0))
    else:
        results.sort(key=lambda r: r["posted_at"] or "", reverse=True)

    domains = [d[0] for d in db.query(Internship.domain).filter(Internship.domain.isnot(None)).distinct().all()]
    return {"items": results, "domains": domains, "count": len(results)}


@router.get("/internships/{internship_id}")
def internship_detail(internship_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Internship not found")
    applied = (
        db.query(Application)
        .filter(Application.student_id == user.id, Application.internship_id == i.id)
        .first()
        is not None
    )
    saved = (
        db.query(SavedInternship)
        .filter(SavedInternship.student_id == user.id, SavedInternship.internship_id == i.id)
        .first()
        is not None
    )
    return internship_payload(i, applied=applied, saved=saved)


# ---------------------------------------------------------------------------
# Save / apply
# ---------------------------------------------------------------------------
@router.post("/internships/{internship_id}/save")
def save_internship(internship_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Internship not found")
    if not db.query(SavedInternship).filter(
        SavedInternship.student_id == user.id, SavedInternship.internship_id == internship_id
    ).first():
        db.add(SavedInternship(student_id=user.id, internship_id=internship_id))
        db.commit()
    return {"saved": True}


@router.delete("/internships/{internship_id}/save")
def unsave_internship(internship_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    db.query(SavedInternship).filter(
        SavedInternship.student_id == user.id, SavedInternship.internship_id == internship_id
    ).delete()
    db.commit()
    return {"saved": False}


class ApplyIn(BaseModel):
    cover_letter: str = ""


@router.post("/internships/{internship_id}/apply")
def apply_internship(internship_id: int, data: ApplyIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Internship not found")
    if i.status != "open":
        raise HTTPException(status_code=400, detail="This internship is closed")
    existing = (
        db.query(Application)
        .filter(Application.student_id == user.id, Application.internship_id == internship_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this internship")
    app = Application(
        student_id=user.id,
        internship_id=internship_id,
        status="applied",
        cover_letter=data.cover_letter or None,
        stage_history='[{"stage":"applied","at":"%s"}]' % datetime.utcnow().isoformat(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    log_action(db, user, "applied", f"Applied to {i.title} @ {i.company.name}")
    # notify company
    notify(db, i.company.user_id, "New application", f"{user.name} applied for {i.title}.")
    return _application_summary(app)


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
@router.get("/student/applications")
def my_applications(user: User = Depends(require_student), db: Session = Depends(get_db)):
    apps = (
        db.query(Application)
        .filter(Application.student_id == user.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return {"items": [_application_summary(a) for a in apps]}


@router.get("/student/saved")
def my_saved(user: User = Depends(require_student), db: Session = Depends(get_db)):
    saved = (
        db.query(SavedInternship)
        .filter(SavedInternship.student_id == user.id)
        .order_by(SavedInternship.saved_at.desc())
        .all()
    )
    return {"items": [internship_payload(s.internship, saved=True) for s in saved]}


# ---------------------------------------------------------------------------
# Tracker
# ---------------------------------------------------------------------------
class TrackerActivate(BaseModel):
    type: str = Field(pattern="^(on-campus|off-campus|college-provided|self-found)$")
    company: str
    role: str
    start_date: date
    end_date: date | None = None
    mentor_name: str = ""
    mentor_email: str = ""
    mode: str = "onsite"
    location: str = ""
    internship_id: int | None = None
    offer_letter_path: str = ""


@router.post("/student/tracker/activate")
def activate_tracker(data: TrackerActivate, user: User = Depends(require_student), db: Session = Depends(get_db)):
    existing = (
        db.query(Tracker)
        .filter(Tracker.student_id == user.id, Tracker.status == "active")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active internship tracker")
    t = Tracker(
        student_id=user.id,
        internship_id=data.internship_id,
        type=data.type,
        company=data.company.strip(),
        role=data.role.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        mentor_name=data.mentor_name or None,
        mentor_email=data.mentor_email or None,
        mode=data.mode,
        location=data.location or None,
        offer_letter_path=data.offer_letter_path or None,
        status="active",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    log_action(db, user, "tracker_activated", f"Started {data.type} internship at {data.company}")
    notify(db, user.id, "Tracker activated", f"Your {data.company} tracker is live. Log daily reports to keep your streak! 🔥", "success")
    # link application if the internship matches
    if data.internship_id:
        app = (
            db.query(Application)
            .filter(Application.student_id == user.id, Application.internship_id == data.internship_id)
            .first()
        )
        if app and app.status in ("applied", "under_review", "shortlisted", "interview", "selected"):
            app.status = "joined"
            app.stage_history = (app.stage_history or "") + f',{{"stage":"joined","at":"{datetime.utcnow().isoformat()}"}}'
            db.commit()
    return tracker_payload(t)


@router.post("/student/tracker/complete")
def complete_tracker(user: User = Depends(require_student), db: Session = Depends(get_db)):
    t = (
        db.query(Tracker)
        .filter(Tracker.student_id == user.id, Tracker.status == "active")
        .first()
    )
    if not t:
        raise HTTPException(status_code=400, detail="No active tracker")
    t.status = "completed"
    t.end_date = t.end_date or _today()
    db.commit()
    pts = _reward_value(db, "internship_completed")
    add_points(db, user, pts, f"Completed internship at {t.company}", badge="internship-completed")
    log_action(db, user, "tracker_completed", f"Completed internship at {t.company}")
    notify(db, user.id, "Internship completed 🎉", f"Congratulations! +{pts} points for completing {t.company}.", "success")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------
@router.post("/student/attendance/checkin")
def check_in(user: User = Depends(require_student), db: Session = Depends(get_db)):
    row = (
        db.query(Attendance)
        .filter(Attendance.student_id == user.id, Attendance.day == _today())
        .first()
    )
    if row and row.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")
    now_dt = datetime.utcnow()
    if not row:
        row = Attendance(student_id=user.id, day=_today(), status="present")
        db.add(row)
    row.check_in = now_dt
    db.commit()
    update_streak(db, user)
    pts = _reward_value(db, "attendance_day")
    add_points(db, user, pts, "Daily check-in", badge="attendance")
    notify(db, user.id, "Checked in ✅", f"Attendance marked. +{pts} points.")
    return {"ok": True, "check_in": now_dt.isoformat()}


@router.post("/student/attendance/checkout")
def check_out(user: User = Depends(require_student), db: Session = Depends(get_db)):
    row = (
        db.query(Attendance)
        .filter(Attendance.student_id == user.id, Attendance.day == _today())
        .first()
    )
    if not row or not row.check_in:
        raise HTTPException(status_code=400, detail="Check in first")
    if row.check_out:
        raise HTTPException(status_code=400, detail="Already checked out")
    row.check_out = datetime.utcnow()
    row.hours = round((row.check_out - row.check_in).total_seconds() / 3600, 2)
    db.commit()
    return {"ok": True, "hours": row.hours}


@router.get("/student/attendance")
def attendance(user: User = Depends(require_student), db: Session = Depends(get_db), month: int | None = None):
    month = month or _today().month
    year = _today().year
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == user.id,
            Attendance.day >= date(year, month, 1),
            Attendance.day <= date(year, month, 28) + timedelta(days=4),
        )
        .all()
    )
    items = [
        {
            "day": r.day.isoformat(),
            "check_in": r.check_in.isoformat() if r.check_in else None,
            "check_out": r.check_out.isoformat() if r.check_out else None,
            "hours": r.hours,
            "status": r.status,
        }
        for r in rows
    ]
    return {"items": items, "month": month}


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
class DailyReportIn(BaseModel):
    content: str = Field(min_length=10)
    hours: float = 0


@router.post("/student/reports/daily")
def submit_daily(data: DailyReportIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    existing = (
        db.query(ReportDaily)
        .filter(ReportDaily.student_id == user.id, ReportDaily.report_date == _today())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Daily report already submitted today")
    r = ReportDaily(student_id=user.id, report_date=_today(), content=data.content, hours=data.hours, status="pending")
    db.add(r)
    db.commit()
    update_streak(db, user)
    log_action(db, user, "daily_report", "Submitted daily report")
    return {"ok": True, "id": r.id, "status": "pending"}


@router.get("/student/reports/daily")
def daily_reports(user: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = (
        db.query(ReportDaily)
        .filter(ReportDaily.student_id == user.id)
        .order_by(ReportDaily.report_date.desc())
        .limit(30)
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "report_date": r.report_date.isoformat(),
                "content": r.content,
                "hours": r.hours,
                "status": r.status,
                "feedback": r.feedback,
                "points": r.points,
            }
            for r in rows
        ]
    }


class WeeklyReportIn(BaseModel):
    content: str = Field(min_length=10)
    highlights: str = ""


@router.post("/student/reports/weekly")
def submit_weekly(data: WeeklyReportIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    week = _week_label(_today())
    existing = (
        db.query(ReportWeekly)
        .filter(ReportWeekly.student_id == user.id, ReportWeekly.week_label == week)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Weekly report already submitted for this week")
    r = ReportWeekly(student_id=user.id, week_label=week, content=data.content, highlights=data.highlights or None, status="pending")
    db.add(r)
    db.commit()
    return {"ok": True, "id": r.id, "week": week}


@router.get("/student/reports/weekly")
def weekly_reports(user: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = (
        db.query(ReportWeekly)
        .filter(ReportWeekly.student_id == user.id)
        .order_by(ReportWeekly.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "week_label": r.week_label,
                "content": r.content,
                "highlights": r.highlights,
                "status": r.status,
                "feedback": r.feedback,
                "points": r.points,
            }
            for r in rows
        ]
    }


# ---------------------------------------------------------------------------
# Deadlines
# ---------------------------------------------------------------------------
@router.get("/student/deadlines")
def deadlines(user: User = Depends(require_student), db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.student_id == user.id).all()
    saved = db.query(SavedInternship).filter(SavedInternship.student_id == user.id).all()
    rows = []
    seen = set()
    for a in apps:
        i = a.internship
        if i.deadline and i.id not in seen:
            seen.add(i.id)
            days = (i.deadline - _today()).days
            rows.append({"internship_id": i.id, "title": i.title, "company": i.company.name,
                         "deadline": i.deadline.isoformat(), "days_left": days, "kind": "applied"})
    for s in saved:
        i = s.internship
        if i.deadline and i.id not in seen:
            seen.add(i.id)
            days = (i.deadline - _today()).days
            rows.append({"internship_id": i.id, "title": i.title, "company": i.company.name,
                         "deadline": i.deadline.isoformat(), "days_left": days, "kind": "saved"})
    rows.sort(key=lambda r: r["days_left"])
    return {"items": rows}


# ---------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------
class CertificateIn(BaseModel):
    title: str
    company: str = ""
    issued_by: str = ""
    doc_path: str = ""


@router.post("/student/certificates")
def submit_certificate(data: CertificateIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    tracker = (
        db.query(Tracker)
        .filter(Tracker.student_id == user.id, Tracker.status == "completed")
        .order_by(Tracker.created_at.desc())
        .first()
    )
    code = f"INT-{user.id}-{int(datetime.utcnow().timestamp())}"
    c = Certificate(
        student_id=user.id,
        tracker_id=tracker.id if tracker else None,
        code=code,
        title=data.title.strip(),
        company=data.company or (tracker.company if tracker else None),
        issued_by=data.issued_by or None,
        doc_path=data.doc_path or None,
        status="pending",
    )
    db.add(c)
    db.commit()
    notify(db, user.id, "Certificate submitted", f"{c.title} sent for verification.", "info")
    log_action(db, user, "certificate_submitted", f"Submitted {c.title} for verification")
    return {"ok": True, "code": code}


@router.get("/student/certificates")
def my_certificates(user: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = (
        db.query(Certificate)
        .filter(Certificate.student_id == user.id)
        .order_by(Certificate.created_at.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "company": c.company,
                "issued_by": c.issued_by,
                "status": c.status,
                "authenticity_score": c.authenticity_score,
                "review_note": c.review_note,
                "created_at": c.created_at.isoformat(),
            }
            for c in rows
        ]
    }


@router.get("/certificates/verify")
def verify_certificate(code: str, db: Session = Depends(get_db)):
    c = db.query(Certificate).filter(Certificate.code == code).first()
    if not c:
        return {"found": False}
    student = db.query(User).filter(User.id == c.student_id).first()
    return {
        "found": True,
        "code": c.code,
        "title": c.title,
        "company": c.company,
        "issued_by": c.issued_by,
        "status": c.status,
        "student": student.name if student else None,
        "authenticity_score": c.authenticity_score,
    }


# ---------------------------------------------------------------------------
# Rewards
# ---------------------------------------------------------------------------
@router.get("/student/rewards")
def rewards(user: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = (
        db.query(Reward)
        .filter(Reward.user_id == user.id)
        .order_by(Reward.created_at.desc())
        .limit(30)
        .all()
    )
    return {
        "points": user.points or 0,
        "streak": user.streak or 0,
        "items": [
            {"badge": r.badge, "reason": r.reason, "points": r.points, "created_at": r.created_at.isoformat()}
            for r in rows
        ],
    }

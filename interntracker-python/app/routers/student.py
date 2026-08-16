"""Student endpoints: dashboard, explorer, applications, tracker, attendance, reports, rewards, certificates."""
import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Application, Attendance, Certificate, CompanyProfile, DailyReport, Enrollment, Internship,
    Notification, RewardLog, SavedInternship, StudentProfile, User, WeeklyReport,
)
from ..security import get_current_user, log_activity, notify, require_role

router = APIRouter(prefix="/api", tags=["student"])
student_only = require_role("student")

APP_ORDER = {"applied": 1, "under_review": 2, "shortlisted": 3, "interview": 4,
             "selected": 5, "rejected": -1, "joined": 6, "completed": 7}

POINTS_DAILY = 10
POINTS_WEEKLY = 50
POINTS_PERFECT_WEEK = 100
POINTS_COMPLETE = 500


def _profile(db: Session, student_id: int) -> StudentProfile:
    p = db.query(StudentProfile).filter_by(user_id=student_id).first()
    if p is None:
        raise HTTPException(400, "Student profile not set up")
    return p


def _internship_dict(db: Session, i: Internship, student_id: int) -> dict:
    company = db.get(User, i.company_id)
    cp = db.query(CompanyProfile).filter_by(user_id=i.company_id).first()
    applied = db.query(Application).filter_by(student_id=student_id, internship_id=i.id).first()
    saved = db.query(SavedInternship).filter_by(student_id=student_id, internship_id=i.id).first()
    return {
        "id": i.id, "title": i.title, "description": i.description, "mode": i.mode,
        "location": i.location, "paid": i.paid, "stipend": i.stipend, "duration": i.duration,
        "domain": i.domain, "skills": i.skills or [], "intern_type": i.intern_type,
        "deadline": i.deadline.isoformat() if i.deadline else None,
        "posted_at": i.posted_at.isoformat() if i.posted_at else None,
        "status": i.status,
        "company": {"id": i.company_id, "name": company.name if company else "Unknown",
                    "verified": bool(cp and cp.verification_status == "verified"),
                    "logo_url": cp.logo_url if cp else "", "location": cp.location if cp else ""},
        "applied": bool(applied), "applied_status": applied.status if applied else None,
        "saved": bool(saved),
    }


def _heatmap(db: Session, student_id: int, days: int = 84) -> list:
    start = date.today() - timedelta(days=days - 1)
    reports = {r.date: r for r in db.query(DailyReport).filter(DailyReport.student_id == student_id,
                                                               DailyReport.date >= start).all()}
    att = {a.date: a for a in db.query(Attendance).filter(Attendance.student_id == student_id,
                                                          Attendance.date >= start).all()}
    out = []
    for d in range(days):
        day = start + timedelta(days=d)
        if day in reports:
            level, color = 4, "done"
        elif day in att and att[day].status == "absent":
            level, color = 1, "absent"
        elif day in att and att[day].status in ("present", "pending"):
            level, color = 2, "pending"
        else:
            level, color = 0, "none"
        out.append({"date": day.isoformat(), "level": level, "color": color})
    return out


def _streak(db: Session, student_id: int) -> dict:
    dates = sorted({r.date for r in db.query(DailyReport).filter_by(student_id=student_id).all()})
    if not dates:
        return {"current": 0, "longest": 0}
    longest = cur = 1
    for a, b in zip(dates, dates[1:]):
        if (b - a).days == 1:
            cur += 1
            longest = max(longest, cur)
        else:
            cur = 1
    today, yesterday = date.today(), date.today() - timedelta(days=1)
    cur2 = 0
    d = today if today in dates else (yesterday if yesterday in dates else None)
    if d:
        cur2 = 1
        while d - timedelta(days=1) in dates:
            cur2 += 1
            d -= timedelta(days=1)
    return {"current": cur2, "longest": longest}


def _update_streak_and_points(db: Session, student_id: int, points: int, reason: str):
    p = _profile(db, student_id)
    p.points += points
    db.add(RewardLog(student_id=student_id, points=points, reason=reason))
    s = _streak(db, student_id)
    p.current_streak, p.longest_streak = s["current"], max(s["longest"], p.longest_streak)
    _check_badges(db, p)
    db.commit()


def _check_badges(db: Session, p: StudentProfile):
    have = set(p.badges or [])
    want = set()
    if p.points >= 10:
        want.add("First Report")
    if p.longest_streak >= 7:
        want.add("7 Day Streak")
    if p.longest_streak >= 30:
        want.add("30 Day Streak")
    if p.longest_streak >= 60:
        want.add("60 Day Streak")
    if p.longest_streak >= 100:
        want.add("100 Day Streak")
    if p.points >= 250:
        want.add("Consistent Intern")
    if p.points >= 600:
        want.add("Report Master")
    if p.points >= 1000:
        want.add("Internship Champion")
    if p.points >= 1500:
        want.add("Top Performer")
    new = want - have
    if new:
        p.badges = sorted(want)
        for b in new:
            notify(db, p.user_id, f"Badge unlocked: {b}", "Keep going — your consistency is paying off.", "reward")


def _deadlines(db: Session, student_id: int) -> list:
    today = date.today()
    out = []
    apps = db.query(Application).filter_by(student_id=student_id).all()
    for a in apps:
        i = a.internship
        if i and i.deadline:
            if a.status not in ("rejected", "completed"):
                out.append({"id": a.id, "title": f"Apply deadline — {i.title}", "date": i.deadline.isoformat(),
                            "kind": "application"})
        if a.interview_date and a.status == "interview":
            out.append({"id": a.id, "title": f"Interview — {i.title if i else 'Internship'}",
                        "date": a.interview_date.isoformat(), "kind": "interview"})
    enr = db.query(Enrollment).filter_by(student_id=student_id, status="active").first()
    if enr and enr.end_date:
        out.append({"id": enr.id, "title": f"Internship ends — {enr.role}", "date": enr.end_date.isoformat(),
                    "kind": "internship_end"})
    # weekly report due (Monday of current week)
    monday = today - timedelta(days=today.weekday())
    has = db.query(WeeklyReport).filter_by(student_id=student_id, week_start=monday).first()
    if not has:
        out.append({"id": 0, "title": "Weekly report due", "date": (monday + timedelta(days=6)).isoformat(),
                    "kind": "weekly"})
    for d in out:
        d["state"] = "overdue" if d["date"] < today.isoformat() else ("due_today" if d["date"] == today.isoformat() else "upcoming")
    out.sort(key=lambda x: x["date"])
    return out


# ---------------------------------------------------------------- dashboard
@router.get("/student/dashboard")
def dashboard(user: User = Depends(student_only), db: Session = Depends(get_db)):
    p = _profile(db, user.id)
    s = _streak(db, user.id)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    days = [week_start + timedelta(days=i) for i in range(7)]
    week_reports = db.query(DailyReport).filter(DailyReport.student_id == user.id,
                                                DailyReport.date >= week_start).count()
    week_att = db.query(Attendance).filter(Attendance.student_id == user.id,
                                           Attendance.date >= week_start).all()
    present = sum(1 for a in week_att if a.status == "present")
    worked_days = sum(1 for a in week_att if a.status != "holiday")
    att_pct = round(present / max(worked_days, 1) * 100)
    enrollment = db.query(Enrollment).filter_by(student_id=user.id, status="active").first()
    enr = None
    if enrollment:
        enr = {"id": enrollment.id, "company": enrollment.company_name, "role": enrollment.role,
               "start_date": enrollment.start_date.isoformat() if enrollment.start_date else None,
               "end_date": enrollment.end_date.isoformat() if enrollment.end_date else None,
               "mentor": enrollment.mentor, "mode": enrollment.mode, "location": enrollment.location,
               "intern_type": enrollment.intern_type, "status": enrollment.status}
    today_report = db.query(DailyReport).filter_by(student_id=user.id, date=today).first()
    apps = db.query(Application).filter_by(student_id=user.id).all()
    applications = [{"id": a.id, "title": a.internship.title if a.internship else "",
                     "company": a.internship.company.name if a.internship and a.internship.company else "",
                     "status": a.status, "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                     "deadline": a.internship.deadline.isoformat() if a.internship and a.internship.deadline else None,
                     "location": a.internship.location if a.internship else "",
                     "mode": a.internship.mode if a.internship else "", "progress": APP_ORDER.get(a.status, 0)}
                    for a in apps]
    saved = db.query(SavedInternship).filter_by(student_id=user.id).count()
    certs = db.query(Certificate).filter_by(student_id=user.id).count()
    rank_row = db.query(StudentProfile).filter(StudentProfile.points > p.points).count() + 1
    total_students = db.query(StudentProfile).count()
    dept_rank = db.query(StudentProfile).filter(StudentProfile.department == p.department,
                                                StudentProfile.points > p.points).count() + 1
    return {
        "profile": {"name": user.name, "email": user.email, "department": p.department, "branch": p.branch,
                    "year": p.year, "cgpa": p.cgpa, "skills": p.skills or [], "photo_url": p.photo_url,
                    "points": p.points, "badges": p.badges or []},
        "stats": {
            "streak": s["current"], "longest_streak": s["longest"],
            "attendance_pct": att_pct, "applications": len(applications), "saved": saved,
            "reports_this_week": week_reports, "certificates": certs,
            "points": p.points, "college_rank": rank_row, "department_rank": dept_rank,
            "total_students": total_students,
        },
        "current_enrollment": enr,
        "today_report_submitted": bool(today_report),
        "heatmap": _heatmap(db, user.id),
        "deadlines": _deadlines(db, user.id),
        "applications": applications[:5],
        "mentor": None,
    }


# ------------------------------------------------------------- internships
@router.get("/internships")
def internships(q: str = "", mode: str = "", paid: str = "", domain: str = "", company: str = "",
                intern_type: str = "", verified_only: bool = False, sort: str = "recent",
                user: User = Depends(student_only), db: Session = Depends(get_db)):
    query = db.query(Internship).filter(Internship.status == "open")
    if q:
        query = query.filter(Internship.title.ilike(f"%{q}%") | Internship.description.ilike(f"%{q}%"))
    if mode:
        query = query.filter(Internship.mode == mode)
    if paid == "paid":
        query = query.filter(Internship.paid.is_(True))
    elif paid == "unpaid":
        query = query.filter(Internship.paid.is_(False))
    if domain:
        query = query.filter(Internship.domain == domain)
    if intern_type:
        query = query.filter(Internship.intern_type == intern_type)
    if company:
        ids = [u.id for u in db.query(User).filter(User.role == "company", User.name.ilike(f"%{company}%")).all()]
        query = query.filter(Internship.company_id.in_(ids))
    if verified_only:
        vids = [cp.user_id for cp in db.query(CompanyProfile).filter_by(verification_status="verified").all()]
        query = query.filter(Internship.company_id.in_(vids))
    if sort == "stipend":
        query = query.order_by(Internship.stipend.desc())
    elif sort == "deadline":
        query = query.order_by(Internship.deadline.asc().nullslast())
    else:
        query = query.order_by(Internship.posted_at.desc())
    items = query.limit(100).all()
    return {"items": [_internship_dict(db, i, user.id) for i in items]}


@router.get("/internships/{iid}")
def internship_detail(iid: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None:
        raise HTTPException(404, "Internship not found")
    return _internship_dict(db, i, user.id)


@router.get("/student/saved")
def saved_internships(user: User = Depends(student_only), db: Session = Depends(get_db)):
    rows = db.query(SavedInternship).filter_by(student_id=user.id).all()
    return {"items": [_internship_dict(db, s.internship, user.id) for s in rows]}


@router.post("/internships/{iid}/save")
def save_internship(iid: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None:
        raise HTTPException(404, "Internship not found")
    if db.query(SavedInternship).filter_by(student_id=user.id, internship_id=iid).first() is None:
        db.add(SavedInternship(student_id=user.id, internship_id=iid))
        db.commit()
    return {"ok": True}


@router.delete("/internships/{iid}/save")
def unsave_internship(iid: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    row = db.query(SavedInternship).filter_by(student_id=user.id, internship_id=iid).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.post("/internships/{iid}/apply")
def apply_internship(iid: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None or i.status != "open":
        raise HTTPException(404, "Internship not found or closed")
    existing = db.query(Application).filter_by(student_id=user.id, internship_id=iid).first()
    if existing:
        raise HTTPException(409, "You have already applied to this internship")
    if i.deadline and i.deadline < date.today():
        raise HTTPException(400, "This internship's deadline has passed")
    a = Application(student_id=user.id, internship_id=iid, status="applied")
    db.add(a)
    db.flush()
    notify(db, i.company_id, "New application", f"{user.name} applied to {i.title}", "application")
    for admin in db.query(User).filter_by(role="admin").all():
        notify(db, admin.id, "New application", f"{user.name} applied to {i.title}", "application")
    db.commit()
    return {"ok": True, "application_id": a.id}


# ------------------------------------------------------------ applications
@router.get("/student/applications")
def my_applications(user: User = Depends(student_only), db: Session = Depends(get_db)):
    rows = db.query(Application).filter_by(student_id=user.id).order_by(Application.applied_at.desc()).all()
    return {"items": [{
        "id": a.id, "internship_id": a.internship_id, "title": a.internship.title if a.internship else "",
        "company": a.internship.company.name if a.internship and a.internship.company else "",
        "verified": bool(db.query(CompanyProfile).filter_by(user_id=a.internship.company_id,
                                                            verification_status="verified").first()),
        "location": a.internship.location if a.internship else "", "mode": a.internship.mode if a.internship else "",
        "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        "deadline": a.internship.deadline.isoformat() if a.internship and a.internship.deadline else None,
        "status": a.status, "progress": APP_ORDER.get(a.status, 0), "interview_date": a.interview_date.isoformat() if a.interview_date else None,
        "notes": a.notes,
    } for a in rows]}


# ---------------------------------------------------------------- tracker
class ActivateIn(BaseModel):
    internship_id: int | None = None
    company_name: str = ""
    role: str = ""
    start_date: date | None = None
    end_date: date | None = None
    mentor: str = ""
    mode: str = "remote"
    location: str = ""
    intern_type: str = "off_campus"
    offer_letter_url: str = ""


@router.post("/student/tracker/activate")
def activate_tracker(data: ActivateIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    existing = db.query(Enrollment).filter_by(student_id=user.id, status="active").first()
    if existing:
        raise HTTPException(409, "You already have an active internship workspace")
    if not data.company_name and not data.internship_id:
        raise HTTPException(400, "Company or internship is required")
    enr = Enrollment(student_id=user.id, internship_id=data.internship_id, company_name=data.company_name,
                     role=data.role, start_date=data.start_date or date.today(), end_date=data.end_date,
                     mentor=data.mentor, mode=data.mode, location=data.location,
                     intern_type=data.intern_type, offer_letter_url=data.offer_letter_url, status="active")
    db.add(enr)
    db.flush()
    if data.internship_id:
        app = db.query(Application).filter_by(student_id=user.id, internship_id=data.internship_id).first()
        if app:
            app.status = "joined"
        db.commit()
    notify(db, user.id, "Internship workspace activated", f"{data.company_name} — {data.role}. Start logging attendance and daily reports.", "success")
    log_activity(db, user.id, "tracker.activate", f"{data.company_name} {data.role}")
    db.commit()
    return {"ok": True, "enrollment_id": enr.id}


@router.get("/student/enrollment")
def my_enrollment(user: User = Depends(student_only), db: Session = Depends(get_db)):
    enr = db.query(Enrollment).filter_by(student_id=user.id).order_by(Enrollment.created_at.desc()).first()
    if enr is None:
        return {"enrollment": None}
    return {"enrollment": {"id": enr.id, "company": enr.company_name, "role": enr.role,
                           "start_date": enr.start_date.isoformat() if enr.start_date else None,
                           "end_date": enr.end_date.isoformat() if enr.end_date else None,
                           "mentor": enr.mentor, "mode": enr.mode, "location": enr.location,
                           "intern_type": enr.intern_type, "status": enr.status,
                           "offer_letter_url": enr.offer_letter_url, "certificate_url": enr.certificate_url,
                           "days_logged": db.query(Attendance).filter_by(student_id=user.id).count(),
                           "reports": db.query(DailyReport).filter_by(student_id=user.id).count()}}


@router.post("/student/enrollment/{eid}/complete")
def complete_enrollment(eid: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    enr = db.get(Enrollment, eid)
    if enr is None or enr.student_id != user.id:
        raise HTTPException(404, "Enrollment not found")
    enr.status = "completed"
    _update_streak_and_points(db, user.id, POINTS_COMPLETE, "Internship completion")
    notify(db, user.id, "Internship completed 🎉", f"{enr.company_name} — {enr.role} marked complete. +{POINTS_COMPLETE} points.", "reward")
    log_activity(db, user.id, "tracker.complete", f"{enr.company_name} {enr.role}")
    return {"ok": True}


# -------------------------------------------------------------- attendance
class AttendanceIn(BaseModel):
    date: date
    status: str = "present"
    check_in: str = ""
    check_out: str = ""
    hours: float = 0.0
    summary: str = ""
    tasks: list[str] = []


@router.get("/student/attendance")
def my_attendance(year: int | None = None, month: int | None = None,
                  user: User = Depends(student_only), db: Session = Depends(get_db)):
    today = date.today()
    y, m = year or today.year, month or today.month
    rows = db.query(Attendance).filter(Attendance.student_id == user.id,
                                       Attendance.date >= date(y, m, 1),
                                       Attendance.date < date(y + (m == 12), m % 12 + 1, 1)).all()
    return {"items": [{"id": a.id, "date": a.date.isoformat(), "status": a.status, "check_in": a.check_in,
                       "check_out": a.check_out, "hours": a.hours, "summary": a.summary,
                       "tasks": a.tasks or [], "verified": a.verified} for a in rows]}


@router.post("/student/attendance")
def submit_attendance(data: AttendanceIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    if data.status not in ("present", "absent", "leave", "holiday"):
        raise HTTPException(400, "Invalid status")
    if data.date > date.today():
        raise HTTPException(400, "Cannot log attendance for a future date")
    row = db.query(Attendance).filter_by(student_id=user.id, date=data.date).first()
    if row is None:
        row = Attendance(student_id=user.id, date=data.date)
        db.add(row)
    row.status = data.status
    row.check_in = data.check_in or row.check_in
    row.check_out = data.check_out or row.check_out
    row.hours = data.hours
    row.summary = data.summary
    row.tasks = data.tasks
    row.verified = False
    db.commit()
    return {"ok": True, "id": row.id}


# ----------------------------------------------------------------- reports
class DailyIn(BaseModel):
    date: date
    tasks: str = ""
    learned: str = ""
    problems: str = ""
    plan: str = ""
    hours: float = 0.0


class WeeklyIn(BaseModel):
    week_start: date
    total_days: int = 0
    attendance_pct: float = 0.0
    total_hours: float = 0.0
    tasks: str = ""
    skills: str = ""
    problems: str = ""
    progress: int = 0


@router.get("/student/reports/daily")
def my_daily_reports(limit: int = 30, user: User = Depends(student_only), db: Session = Depends(get_db)):
    rows = db.query(DailyReport).filter_by(student_id=user.id).order_by(DailyReport.date.desc()).limit(limit).all()
    return {"items": [{"id": r.id, "date": r.date.isoformat(), "tasks": r.tasks, "learned": r.learned,
                       "problems": r.problems, "plan": r.plan, "hours": r.hours, "status": r.status,
                       "feedback": r.feedback, "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None}
                      for r in rows]}


@router.post("/student/reports/daily")
def submit_daily_report(data: DailyIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    if data.date > date.today():
        raise HTTPException(400, "Cannot submit a report for a future date")
    row = db.query(DailyReport).filter_by(student_id=user.id, date=data.date).first()
    is_new = row is None
    if row is None:
        row = DailyReport(student_id=user.id, date=data.date)
        db.add(row)
    row.tasks, row.learned, row.problems, row.plan, row.hours = data.tasks, data.learned, data.problems, data.plan, data.hours
    if is_new:
        row.status = "pending"
        row.submitted_at = datetime.utcnow()
    p = _profile(db, user.id)
    p.last_report_date = data.date
    s = _streak(db, user.id)
    p.current_streak, p.longest_streak = s["current"], max(s["longest"], p.longest_streak)
    if is_new:
        p.points += POINTS_DAILY
        db.add(RewardLog(student_id=user.id, points=POINTS_DAILY, reason="Daily report"))
        if s["current"] in (7, 14, 30, 60, 100):
            p.points += {7: 50, 14: 100, 30: 200, 60: 300, 100: 500}[s["current"]]
            db.add(RewardLog(student_id=user.id, points={7: 50, 14: 100, 30: 200, 60: 300, 100: 500}[s["current"]],
                             reason=f"{s['current']} day streak"))
            notify(db, user.id, f"🔥 {s['current']} day streak!", "Incredible consistency. Bonus points awarded.", "reward")
    _check_badges(db, p)
    db.commit()
    # notify mentor + admins
    if is_new:
        mentor = db.get(User, p.mentor_id) if p.mentor_id else None
        if mentor:
            notify(db, mentor.id, "Daily report submitted", f"{user.name} submitted today's report", "report")
        for admin in db.query(User).filter_by(role="admin").all():
            notify(db, admin.id, "Daily report submitted", f"{user.name} submitted today's report", "report")
        db.commit()
    return {"ok": True, "id": row.id, "points_earned": POINTS_DAILY if is_new else 0}


@router.get("/student/reports/weekly")
def my_weekly_reports(user: User = Depends(student_only), db: Session = Depends(get_db)):
    rows = db.query(WeeklyReport).filter_by(student_id=user.id).order_by(WeeklyReport.week_start.desc()).all()
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    # build draft for the current week
    days = [monday + timedelta(days=i) for i in range(7) if monday + timedelta(days=i) <= today]
    att = db.query(Attendance).filter(Attendance.student_id == user.id, Attendance.date >= monday).all()
    reports = db.query(DailyReport).filter(DailyReport.student_id == user.id, DailyReport.date >= monday).all()
    present = sum(1 for a in att if a.status == "present")

    def first_lines(text: str, n: int) -> str:
        lines = (text or "").splitlines()
        return " • ".join(lines[:n]) if lines else "-"

    worked_days = sum(1 for a in att if a.status != "holiday")
    draft = {
        "week_start": monday.isoformat(),
        "total_days": worked_days or len(reports),
        "attendance_pct": round(present / max(worked_days, 1) * 100),
        "total_hours": round(sum(r.hours for r in reports), 1),
        "tasks": " • ".join(first_lines(r.tasks, 3) for r in reports[:5])[:400],
        "skills": ", ".join((p.skills or [])[:5]) if (p := _profile(db, user.id)) else "",
        "problems": " • ".join(first_lines(r.problems, 2) for r in reports[:5])[:300],
        "progress": min(100, len(reports) * 15),
    }
    existing = db.query(WeeklyReport).filter_by(student_id=user.id, week_start=monday).first()
    return {"draft": draft, "submitted": {"id": existing.id, "week_start": existing.week_start.isoformat(),
                                          "attendance_pct": existing.attendance_pct, "total_hours": existing.total_hours,
                                          "tasks": existing.tasks, "status": existing.status, "feedback": existing.feedback}
            if existing else None,
            "history": [{"id": r.id, "week_start": r.week_start.isoformat(), "attendance_pct": r.attendance_pct,
                         "total_hours": r.total_hours, "progress": r.progress, "status": r.status} for r in rows]}


@router.post("/student/reports/weekly")
def submit_weekly_report(data: WeeklyIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    row = db.query(WeeklyReport).filter_by(student_id=user.id, week_start=data.week_start).first()
    is_new = row is None
    if row is None:
        row = WeeklyReport(student_id=user.id, week_start=data.week_start)
        db.add(row)
    row.total_days, row.attendance_pct, row.total_hours = data.total_days, data.attendance_pct, data.total_hours
    row.tasks, row.skills, row.problems, row.progress = data.tasks, data.skills, data.problems, data.progress
    if is_new:
        row.status = "pending"
        row.submitted_at = datetime.utcnow()
        p = _profile(db, user.id)
        p.points += POINTS_WEEKLY
        db.add(RewardLog(student_id=user.id, points=POINTS_WEEKLY, reason="Weekly report"))
        _check_badges(db, p)
        db.commit()
        mentor = db.get(User, p.mentor_id) if p.mentor_id else None
        if mentor:
            notify(db, mentor.id, "Weekly report submitted", f"{user.name} submitted their weekly summary", "report")
        for admin in db.query(User).filter_by(role="admin").all():
            notify(db, admin.id, "Weekly report submitted", f"{user.name} submitted their weekly summary", "report")
        db.commit()
    else:
        db.commit()
    return {"ok": True, "id": row.id}


# ----------------------------------------------------------------- rewards
@router.get("/student/rewards")
def my_rewards(user: User = Depends(student_only), db: Session = Depends(get_db)):
    p = _profile(db, user.id)
    logs = db.query(RewardLog).filter_by(student_id=user.id).order_by(RewardLog.created_at.desc()).limit(30).all()
    milestones = [10, 50, 100, 250, 500, 1000, 1500]
    next_pts = next((m for m in milestones if p.points < m), None)
    return {"points": p.points, "badges": p.badges or [], "logs": [{"points": l.points, "reason": l.reason,
                                                                    "created_at": l.created_at.isoformat() if l.created_at else None}
                                                                   for l in logs],
            "next_milestone": next_pts, "progress_to_next": round((p.points / next_pts) * 100) if next_pts else 100}


# ------------------------------------------------------------- certificates
class CertificateIn(BaseModel):
    title: str
    cert_type: str = "internship"
    company_name: str = ""
    file_url: str = ""
    notes: str = ""


@router.get("/student/certificates")
def my_certificates(user: User = Depends(student_only), db: Session = Depends(get_db)):
    rows = db.query(Certificate).filter_by(student_id=user.id).order_by(Certificate.created_at.desc()).all()
    return {"items": [{"id": c.id, "title": c.title, "cert_type": c.cert_type, "company_name": c.company_name,
                       "file_url": c.file_url, "notes": c.notes, "score": c.score, "status": c.status,
                       "indicators": c.indicators or [],
                       "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]}


@router.post("/student/certificates")
def submit_certificate(data: CertificateIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    score = 40
    indicators = []
    company = None
    if data.company_name:
        company = db.query(CompanyProfile).filter(CompanyProfile.name.ilike(f"%{data.company_name}%")).first()
    if company:
        if company.verification_status == "verified":
            score += 30
            indicators.append("Company matches a verified company in our registry")
        else:
            score += 10
            indicators.append("Company found in registry but not yet verified")
    else:
        indicators.append("Company not found in our verified registry")
    if data.file_url:
        score += 15
        indicators.append("Document attached")
    if len(data.notes) >= 20:
        score += 5
    if re.search(r"certif|intern|complet|experience", data.title.lower()):
        score += 10
        indicators.append("Title matches an internship certificate pattern")
    if len(data.title) < 8:
        score -= 10
        indicators.append("Title is unusually short")
    if data.notes and re.search(r"fake|template|purchase", data.notes.lower()):
        score -= 25
        indicators.append("Notes contain suspicious keywords")
    score = max(0, min(100, score))
    status = "verified" if score >= 70 else ("review" if score >= 40 else "suspicious")
    c = Certificate(student_id=user.id, title=data.title, cert_type=data.cert_type,
                    company_name=data.company_name, file_url=data.file_url, notes=data.notes,
                    score=score, status=status, indicators=indicators)
    db.add(c)
    db.commit()
    notify(db, user.id, "Certificate verification complete",
           f"{data.title}: {'🟢 Verified' if status == 'verified' else '🟡 Requires review' if status == 'review' else '🔴 Suspicious'} (score {score}/100)", "certificate")
    if status != "verified":
        for admin in db.query(User).filter_by(role="admin").all():
            notify(db, admin.id, "Certificate needs review", f"{user.name} submitted '{data.title}' — flagged as {status}", "certificate")
    db.commit()
    return {"ok": True, "id": c.id, "score": score, "status": status, "indicators": indicators}


# ------------------------------------------------------------------ profile
class ProfileIn(BaseModel):
    bio: str = ""
    skills: list[str] = []
    resume_url: str = ""
    photo_url: str = ""
    cgpa: float = 0.0
    year: str = ""
    semester: str = ""
    department: str = ""
    branch: str = ""


@router.get("/student/profile")
def my_profile(user: User = Depends(student_only), db: Session = Depends(get_db)):
    p = _profile(db, user.id)
    s = _streak(db, user.id)
    apps = db.query(Application).filter_by(student_id=user.id).count()
    att = db.query(Attendance).filter_by(student_id=user.id).all()
    present = sum(1 for a in att if a.status == "present")
    enrollments = db.query(Enrollment).filter_by(student_id=user.id).all()
    certs = db.query(Certificate).filter_by(student_id=user.id).all()
    return {
        "name": user.name, "email": user.email, "role": user.role,
        "college": p.college, "department": p.department, "branch": p.branch, "year": p.year,
        "semester": p.semester, "cgpa": p.cgpa, "skills": p.skills or [], "bio": p.bio,
        "photo_url": p.photo_url, "resume_url": p.resume_url, "points": p.points,
        "badges": p.badges or [], "streak": s["current"], "longest_streak": s["longest"],
        "applications": apps, "attendance_pct": round(present / max(len(att), 1) * 100),
        "internships": [{"company": e.company_name, "role": e.role, "start_date": e.start_date.isoformat() if e.start_date else None,
                         "end_date": e.end_date.isoformat() if e.end_date else None, "status": e.status} for e in enrollments],
        "certificates": [{"title": c.title, "company": c.company_name, "status": c.status} for c in certs],
        "mentor": {"id": p.mentor_id, "name": db.get(User, p.mentor_id).name} if p.mentor_id and db.get(User, p.mentor_id) else None,
    }


@router.patch("/student/profile")
def update_profile(data: ProfileIn, user: User = Depends(student_only), db: Session = Depends(get_db)):
    p = _profile(db, user.id)
    p.bio = data.bio if data.bio else p.bio
    p.skills = data.skills if data.skills else p.skills
    p.resume_url = data.resume_url or p.resume_url
    p.photo_url = data.photo_url or p.photo_url
    p.cgpa = data.cgpa if data.cgpa else p.cgpa
    p.year = data.year or p.year
    p.semester = data.semester or p.semester
    p.department = data.department or p.department
    p.branch = data.branch or p.branch
    db.commit()
    return {"ok": True}

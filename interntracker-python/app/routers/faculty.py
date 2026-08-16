"""Faculty endpoints: assigned students, report review, performance."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (Attendance, DailyReport, Enrollment, Notification, StudentProfile,
                      User, WeeklyReport)
from ..security import get_current_user, log_activity, notify, require_role

router = APIRouter(prefix="/api/faculty", tags=["faculty"])
faculty_only = require_role("faculty")


def _assigned(db: Session, faculty_id: int):
    return db.query(StudentProfile).filter_by(mentor_id=faculty_id).all()


def _student_card(db: Session, sp: StudentProfile) -> dict:
    u = db.get(User, sp.user_id)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    reports = db.query(DailyReport).filter_by(student_id=sp.user_id).all()
    week_reports = db.query(DailyReport).filter(DailyReport.student_id == sp.user_id,
                                                DailyReport.date >= week_start).count()
    pending = sum(1 for r in reports if r.status == "pending")
    att = db.query(Attendance).filter_by(student_id=sp.user_id).all()
    present = sum(1 for a in att if a.status == "present")
    att_pct = round(present / max(len(att), 1) * 100)
    enr = db.query(Enrollment).filter_by(student_id=sp.user_id, status="active").first()
    days_missed = 0
    if sp.last_report_date:
        gap = (today - sp.last_report_date).days
        if gap > 1:
            days_missed = gap - 1
    at_risk = sp.current_streak == 0 or (att_pct < 60 and att) or (enr and days_missed >= 3)
    return {
        "id": sp.user_id, "name": u.name, "email": u.email, "department": sp.department,
        "branch": sp.branch, "year": sp.year, "cgpa": sp.cgpa, "streak": sp.current_streak,
        "points": sp.points, "attendance_pct": att_pct, "reports_total": len(reports),
        "reports_week": week_reports, "pending_reports": pending, "days_missed": days_missed,
        "at_risk": at_risk,
        "enrollment": {"company": enr.company_name, "role": enr.role, "end_date": enr.end_date.isoformat() if enr.end_date else None}
        if enr else None,
    }


@router.get("/dashboard")
def dashboard(user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    students = _assigned(db, user.id)
    cards = [_student_card(db, sp) for sp in students]
    active = sum(1 for c in cards if c["enrollment"])
    at_risk = sum(1 for c in cards if c["at_risk"])
    pending_daily = sum(c["pending_reports"] for c in cards)
    weekly_pending = 0
    for sp in students:
        monday = date.today() - timedelta(days=date.today().weekday())
        if db.query(WeeklyReport).filter_by(student_id=sp.user_id, week_start=monday).first() is None:
            weekly_pending += 1
    return {"total_students": len(cards), "active_internships": active, "at_risk": at_risk,
            "pending_reports": pending_daily, "weekly_pending": weekly_pending, "students": cards}


@router.get("/students")
def students(user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    cards = [_student_card(db, sp) for sp in _assigned(db, user.id)]
    return {"items": sorted(cards, key=lambda c: c["at_risk"], reverse=True)}


@router.get("/students/{sid}")
def student_detail(sid: int, user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    sp = _assigned(db, user.id)
    if not any(s.user_id == sid for s in sp):
        raise HTTPException(403, "This student is not assigned to you")
    reports = db.query(DailyReport).filter_by(student_id=sid).order_by(DailyReport.date.desc()).limit(30).all()
    weekly = db.query(WeeklyReport).filter_by(student_id=sid).order_by(WeeklyReport.week_start.desc()).all()
    att = db.query(Attendance).filter_by(student_id=sid).order_by(Attendance.date.desc()).limit(60).all()
    u = db.get(User, sid)
    return {"student": _student_card(db, db.query(StudentProfile).filter_by(user_id=sid).first()),
            "daily": [{"id": r.id, "date": r.date.isoformat(), "tasks": r.tasks, "learned": r.learned,
                       "problems": r.problems, "hours": r.hours, "status": r.status, "feedback": r.feedback} for r in reports],
            "weekly": [{"id": r.id, "week_start": r.week_start.isoformat(), "attendance_pct": r.attendance_pct,
                        "total_hours": r.total_hours, "progress": r.progress, "status": r.status, "feedback": r.feedback,
                        "tasks": r.tasks} for r in weekly],
            "attendance": [{"date": a.date.isoformat(), "status": a.status, "hours": a.hours, "summary": a.summary} for a in att]}


class ReviewIn(BaseModel):
    approve: bool
    feedback: str = ""


@router.post("/reports/daily/{rid}/review")
def review_daily(rid: int, data: ReviewIn, user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    r = db.get(DailyReport, rid)
    if r is None:
        raise HTTPException(404, "Report not found")
    sp = _assigned(db, user.id)
    if not any(s.user_id == r.student_id for s in sp):
        raise HTTPException(403, "Not your student")
    r.status = "approved" if data.approve else "rejected"
    r.feedback = data.feedback
    r.reviewed_by = user.id
    db.commit()
    notify(db, r.student_id, f"Daily report {r.status}",
           f"Your report for {r.date} was {r.status}" + (f": {data.feedback}" if data.feedback else ""), "report")
    log_activity(db, user.id, "report.review", f"daily report {rid} {r.status}")
    db.commit()
    return {"ok": True}


@router.post("/reports/weekly/{rid}/review")
def review_weekly(rid: int, data: ReviewIn, user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    r = db.get(WeeklyReport, rid)
    if r is None:
        raise HTTPException(404, "Report not found")
    sp = _assigned(db, user.id)
    if not any(s.user_id == r.student_id for s in sp):
        raise HTTPException(403, "Not your student")
    r.status = "approved" if data.approve else "rejected"
    r.feedback = data.feedback
    r.reviewed_by = user.id
    db.commit()
    notify(db, r.student_id, f"Weekly report {r.status}",
           f"Your weekly summary was {r.status}" + (f": {data.feedback}" if data.feedback else ""), "report")
    log_activity(db, user.id, "report.review", f"weekly report {rid} {r.status}")
    db.commit()
    return {"ok": True}


@router.get("/reports/pending")
def pending_reports(user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    sp_ids = [s.user_id for s in _assigned(db, user.id)]
    daily = db.query(DailyReport).filter(DailyReport.student_id.in_(sp_ids),
                                         DailyReport.status == "pending").order_by(DailyReport.date.desc()).all()
    weekly = db.query(WeeklyReport).filter(WeeklyReport.student_id.in_(sp_ids),
                                           WeeklyReport.status == "pending").order_by(WeeklyReport.week_start.desc()).all()
    return {"daily": [{"id": r.id, "student": db.get(User, r.student_id).name, "student_id": r.student_id,
                       "date": r.date.isoformat(), "tasks": r.tasks[:200], "hours": r.hours} for r in daily],
            "weekly": [{"id": r.id, "student": db.get(User, r.student_id).name, "student_id": r.student_id,
                        "week_start": r.week_start.isoformat(), "progress": r.progress} for r in weekly]}


@router.get("/performance")
def performance(user: User = Depends(faculty_only), db: Session = Depends(get_db)):
    sp_ids = [s.user_id for s in _assigned(db, user.id)]
    weeks = []
    today = date.today()
    for w in range(8):
        start = today - timedelta(days=today.weekday() + w * 7)
        rows = db.query(DailyReport).filter(DailyReport.student_id.in_(sp_ids),
                                            DailyReport.date >= start,
                                            DailyReport.date < start + timedelta(days=7)).all()
        weeks.append({"week": start.isoformat(),
                      "reports": len(rows),
                      "hours": round(sum(r.hours for r in rows), 1),
                      "students_reporting": len({r.student_id for r in rows})})
    weeks.reverse()
    return {"weeks": weeks}

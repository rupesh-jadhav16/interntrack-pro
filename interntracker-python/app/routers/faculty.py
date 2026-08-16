"""Faculty endpoints: dashboard, assigned students, report review queue, performance."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Application,
    Attendance,
    ReportDaily,
    ReportWeekly,
    StudentProfile,
    Tracker,
    User,
)
from ..security import add_points, log_action, notify, public_user, require_faculty

router = APIRouter(prefix="/api", tags=["faculty"])


def _assigned_students(db: Session, faculty_id: int):
    return (
        db.query(User)
        .filter(User.role == "student", User.mentor_id == faculty_id, User.is_active.is_(True))
        .order_by(User.name)
        .all()
    )


def _risk_flags(db: Session, student: User):
    flags = []
    today = date.today()
    # no streak
    if (student.streak or 0) == 0:
        flags.append("No active streak — student hasn't logged activity recently")
    # attendance low
    month_start = today.replace(day=1)
    att = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id, Attendance.day >= month_start)
        .all()
    )
    if att:
        pct = sum(1 for r in att if r.status == "present") / len(att) * 100
        if pct < 60:
            flags.append(f"Attendance below 60% this month ({pct:.0f}%)")
    # report gap: last daily report older than 3 days while tracker active
    tracker = (
        db.query(Tracker)
        .filter(Tracker.student_id == student.id, Tracker.status == "active")
        .first()
    )
    if tracker:
        last = (
            db.query(ReportDaily)
            .filter(ReportDaily.student_id == student.id)
            .order_by(ReportDaily.report_date.desc())
            .first()
        )
        if last and (today - last.report_date).days > 3:
            flags.append(f"No daily report for {(today - last.report_date).days} days")
        elif not last:
            flags.append("Active tracker but no daily reports submitted yet")
    return flags


@router.get("/faculty/dashboard")
def faculty_dashboard(user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    students = _assigned_students(db, user.id)
    at_risk = []
    for s in students:
        flags = _risk_flags(db, s)
        if flags:
            at_risk.append({"student": public_user(s), "flags": flags})

    pending_daily = (
        db.query(ReportDaily).filter(ReportDaily.status == "pending").count()
    )
    pending_weekly = (
        db.query(ReportWeekly).filter(ReportWeekly.status == "pending").count()
    )
    active_trackers = 0
    for s in students:
        if db.query(Tracker).filter(Tracker.student_id == s.id, Tracker.status == "active").first():
            active_trackers += 1

    # weekly performance chart data (last 8 weeks, approved reports)
    weeks = []
    today = date.today()
    sids = [s.id for s in students]
    for w in range(7, -1, -1):
        start = today - timedelta(days=w * 7 + 6)
        end = today - timedelta(days=w * 7)
        count = 0
        if sids:
            count = (
                db.query(ReportDaily)
                .filter(
                    ReportDaily.student_id.in_(sids),
                    ReportDaily.status == "approved",
                    ReportDaily.report_date >= start,
                    ReportDaily.report_date <= end,
                )
                .count()
            )
        iso = end.isocalendar()
        weeks.append({"label": f"{iso[0]}-W{iso[1]:02d}", "reports": count})

    return {
        "student_count": len(students),
        "at_risk": at_risk,
        "pending_daily": pending_daily,
        "pending_weekly": pending_weekly,
        "active_trackers": active_trackers,
        "weekly_chart": weeks,
        "user": public_user(user),
    }


@router.get("/faculty/students")
def faculty_students(user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    students = _assigned_students(db, user.id)
    items = []
    for s in students:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == s.id).first()
        tracker = (
            db.query(Tracker)
            .filter(Tracker.student_id == s.id, Tracker.status == "active")
            .first()
        )
        apps = db.query(Application).filter(Application.student_id == s.id).count()
        items.append(
            {
                "student": public_user(s),
                "branch": profile.branch if profile else None,
                "year": profile.year if profile else None,
                "current_internship": tracker.company if tracker else None,
                "applications": apps,
                "flags": _risk_flags(db, s),
            }
        )
    return {"items": items}


@router.get("/faculty/students/{student_id}")
def student_detail(student_id: int, user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.mentor_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="This student is not assigned to you")

    daily = (
        db.query(ReportDaily)
        .filter(ReportDaily.student_id == student.id)
        .order_by(ReportDaily.report_date.desc())
        .limit(20)
        .all()
    )
    weekly = (
        db.query(ReportWeekly)
        .filter(ReportWeekly.student_id == student.id)
        .order_by(ReportWeekly.created_at.desc())
        .limit(10)
        .all()
    )
    att = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id)
        .order_by(Attendance.day.desc())
        .limit(30)
        .all()
    )
    tracker = (
        db.query(Tracker)
        .filter(Tracker.student_id == student.id)
        .order_by(Tracker.created_at.desc())
        .first()
    )
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()

    return {
        "student": public_user(student),
        "profile": {
            "branch": profile.branch if profile else None,
            "year": profile.year if profile else None,
            "cgpa": profile.cgpa if profile else None,
            "phone": profile.phone if profile else None,
            "skills": profile.skills if profile else None,
        },
        "tracker": {
            "company": tracker.company if tracker else None,
            "role": tracker.role if tracker else None,
            "start_date": tracker.start_date.isoformat() if tracker and tracker.start_date else None,
            "status": tracker.status if tracker else None,
        },
        "daily_reports": [
            {
                "id": r.id,
                "report_date": r.report_date.isoformat(),
                "content": r.content,
                "hours": r.hours,
                "status": r.status,
                "feedback": r.feedback,
            }
            for r in daily
        ],
        "weekly_reports": [
            {
                "id": r.id,
                "week_label": r.week_label,
                "content": r.content,
                "status": r.status,
                "feedback": r.feedback,
            }
            for r in weekly
        ],
        "attendance": [
            {
                "day": a.day.isoformat(),
                "check_in": a.check_in.isoformat() if a.check_in else None,
                "check_out": a.check_out.isoformat() if a.check_out else None,
                "hours": a.hours,
            }
            for a in att
        ],
    }


# ---------------------------------------------------------------------------
# Report review
# ---------------------------------------------------------------------------
class ReviewIn(BaseModel):
    approve: bool
    feedback: str = ""


@router.post("/faculty/reports/{kind}/{report_id}/review")
def review_report(kind: str, report_id: int, data: ReviewIn, user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    from ..config import REWARD_DEFAULTS
    from ..models import RewardConfig

    def _val(key: str) -> int:
        cfg = db.query(RewardConfig).filter(RewardConfig.key == key).first()
        return cfg.value if cfg else REWARD_DEFAULTS.get(key, 0)

    if kind == "daily":
        r = db.query(ReportDaily).filter(ReportDaily.id == report_id).first()
        key = "daily_report"
        label = "Daily report approved"
    elif kind == "weekly":
        r = db.query(ReportWeekly).filter(ReportWeekly.id == report_id).first()
        key = "weekly_report"
        label = "Weekly report approved"
    else:
        raise HTTPException(status_code=400, detail="Invalid report kind")

    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    if r.status != "pending":
        raise HTTPException(status_code=400, detail="Report already reviewed")
    r.status = "approved" if data.approve else "rejected"
    r.feedback = data.feedback or None
    r.reviewed_by = user.id
    if data.approve:
        pts = _val(key)
        r.points = pts
        student = db.query(User).filter(User.id == r.student_id).first()
        add_points(db, student, pts, label, badge="report")
        notify(db, r.student_id, "Report approved ✅", f"{label}. +{pts} points.", "success")
    else:
        notify(db, r.student_id, "Report needs changes", f"Your {kind} report was rejected: {data.feedback or 'No feedback provided'}", "warning")
    db.commit()
    log_action(db, user, "reviewed_report", f"{kind} report #{report_id} {'approved' if data.approve else 'rejected'}")
    return {"ok": True}


@router.get("/faculty/reports/pending")
def pending_reports(user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    daily = (
        db.query(ReportDaily)
        .filter(ReportDaily.status == "pending")
        .order_by(ReportDaily.created_at.asc())
        .limit(50)
        .all()
    )
    weekly = (
        db.query(ReportWeekly)
        .filter(ReportWeekly.status == "pending")
        .order_by(ReportWeekly.created_at.asc())
        .limit(50)
        .all()
    )
    return {
        "daily": [
            {
                "id": r.id,
                "report_date": r.report_date.isoformat(),
                "content": r.content,
                "hours": r.hours,
                "student": public_user(db.query(User).filter(User.id == r.student_id).first()),
            }
            for r in daily
        ],
        "weekly": [
            {
                "id": r.id,
                "week_label": r.week_label,
                "content": r.content,
                "highlights": r.highlights,
                "student": public_user(db.query(User).filter(User.id == r.student_id).first()),
            }
            for r in weekly
        ],
    }


@router.get("/faculty/performance")
def performance(user: User = Depends(require_faculty), db: Session = Depends(get_db)):
    students = _assigned_students(db, user.id)
    sids = [s.id for s in students]
    today = date.today()
    weeks = []
    for w in range(7, -1, -1):
        start = today - timedelta(days=w * 7 + 6)
        end = today - timedelta(days=w * 7)
        count = 0
        if sids:
            count = (
                db.query(ReportDaily)
                .filter(
                    ReportDaily.student_id.in_(sids),
                    ReportDaily.status == "approved",
                    ReportDaily.report_date >= start,
                    ReportDaily.report_date <= end,
                )
                .count()
            )
        iso = end.isocalendar()
        weeks.append({"label": f"{iso[0]}-W{iso[1]:02d}", "reports": count})

    # attendance over last 14 days
    att_series = []
    for d in range(13, -1, -1):
        day = today - timedelta(days=d)
        cnt = 0
        if sids:
            cnt = (
                db.query(Attendance)
                .filter(Attendance.student_id.in_(sids), Attendance.day == day)
                .count()
            )
        att_series.append({"label": day.strftime("%d %b"), "present": cnt})
    return {"weekly_chart": weeks, "attendance_chart": att_series}

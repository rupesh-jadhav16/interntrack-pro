"""Company endpoints: profile, post/manage internships, applicant pipeline, intern monitor."""
import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import APPLICATION_STAGES
from ..database import get_db
from ..models import (
    Application,
    Attendance,
    Company,
    Feedback,
    Internship,
    ReportDaily,
    Tracker,
    User,
)
from ..security import (
    company_payload,
    internship_payload,
    log_action,
    notify,
    public_user,
    require_company,
)

router = APIRouter(prefix="/api", tags=["company"])


def _company(db: Session, user: User) -> Company:
    c = db.query(Company).filter(Company.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return c


def _own_internship_ids(db: Session, user: User):
    comp = _company(db, user)
    return [i.id for i in db.query(Internship).filter(Internship.company_id == comp.id).all()]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get("/company/dashboard")
def company_dashboard(user: User = Depends(require_company), db: Session = Depends(get_db)):
    comp = _company(db, user)
    internships = db.query(Internship).filter(Internship.company_id == comp.id).all()
    ids = [i.id for i in internships]
    applications = db.query(Application).filter(Application.internship_id.in_(ids)).all() if ids else []

    status_counts = {}
    for a in applications:
        status_counts[a.status] = status_counts.get(a.status, 0) + 1

    interns = [a for a in applications if a.status == "joined"]

    return {
        "company": company_payload(comp),
        "verified": bool(user.verified),
        "verification_status": user.verification_status,
        "internship_count": len(internships),
        "open_internships": sum(1 for i in internships if i.status == "open"),
        "application_count": len(applications),
        "intern_count": len(interns),
        "status_counts": status_counts,
        "interns": [
            {
                "id": a.id,
                "student": public_user(a.student),
                "internship": a.internship.title,
                "joined_at": a.updated_at.isoformat() if a.updated_at else None,
            }
            for a in interns
        ],
        "user": public_user(user),
    }


# ---------------------------------------------------------------------------
# Profile + verification re-submit
# ---------------------------------------------------------------------------
@router.get("/company/profile")
def company_profile(user: User = Depends(require_company), db: Session = Depends(get_db)):
    comp = _company(db, user)
    return {
        "company": company_payload(comp),
        "verified": bool(user.verified),
        "verification_status": user.verification_status,
        "verification_note": user.verification_note,
        "user": public_user(user),
    }


class CompanyProfileIn(BaseModel):
    name: str
    website: str = ""
    industry: str = ""
    description: str = ""
    location: str = ""
    docs: str = ""


@router.put("/company/profile")
def update_company_profile(data: CompanyProfileIn, user: User = Depends(require_company), db: Session = Depends(get_db)):
    comp = _company(db, user)
    comp.name = data.name.strip()
    comp.website = data.website or None
    comp.industry = data.industry or None
    comp.description = data.description or None
    comp.location = data.location or None
    if data.docs:
        comp.docs = data.docs
    user.company_name = comp.name
    user.company_website = comp.website
    user.company_industry = comp.industry
    user.company_description = comp.description
    # re-submit for verification if not verified
    if not user.verified:
        comp.status = "pending"
        user.verification_status = "pending"
    db.commit()
    log_action(db, user, "company_profile", "Updated company profile")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Internships
# ---------------------------------------------------------------------------
class InternshipIn(BaseModel):
    title: str = Field(min_length=3)
    description: str = ""
    domain: str = ""
    location: str = ""
    mode: str = "remote"
    duration_months: int = 3
    stipend: str = "Unpaid"
    paid: bool = False
    skills: list[str] = []
    seats: int = 1
    deadline: date | None = None


@router.post("/company/internships")
def create_internship(data: InternshipIn, user: User = Depends(require_company), db: Session = Depends(get_db)):
    comp = _company(db, user)
    i = Internship(
        company_id=comp.id,
        title=data.title.strip(),
        description=data.description or None,
        domain=data.domain or None,
        location=data.location or None,
        mode=data.mode,
        duration_months=data.duration_months,
        stipend=data.stipend or "Unpaid",
        paid=data.paid,
        skills=",".join(data.skills) if data.skills else None,
        seats=data.seats,
        deadline=data.deadline,
        status="open",
    )
    db.add(i)
    db.commit()
    db.refresh(i)
    log_action(db, user, "internship_posted", f"Posted '{i.title}'")
    return internship_payload(i)


@router.put("/company/internships/{internship_id}")
def update_internship(internship_id: int, data: InternshipIn, user: User = Depends(require_company), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i or i.company_id != _company(db, user).id:
        raise HTTPException(status_code=404, detail="Internship not found")
    i.title = data.title.strip()
    i.description = data.description or None
    i.domain = data.domain or None
    i.location = data.location or None
    i.mode = data.mode
    i.duration_months = data.duration_months
    i.stipend = data.stipend or "Unpaid"
    i.paid = data.paid
    i.skills = ",".join(data.skills) if data.skills else None
    i.seats = data.seats
    i.deadline = data.deadline
    db.commit()
    return internship_payload(i)


@router.post("/company/internships/{internship_id}/close")
def close_internship(internship_id: int, user: User = Depends(require_company), db: Session = Depends(get_db)):
    i = db.query(Internship).filter(Internship.id == internship_id).first()
    if not i or i.company_id != _company(db, user).id:
        raise HTTPException(status_code=404, detail="Internship not found")
    i.status = "closed"
    db.commit()
    return {"ok": True}


@router.get("/company/internships")
def my_internships(user: User = Depends(require_company), db: Session = Depends(get_db)):
    comp = _company(db, user)
    rows = (
        db.query(Internship)
        .filter(Internship.company_id == comp.id)
        .order_by(Internship.posted_at.desc())
        .all()
    )
    items = []
    for i in rows:
        payload = internship_payload(i)
        payload["applicant_count"] = db.query(Application).filter(Application.internship_id == i.id).count()
        items.append(payload)
    return {"items": items}


# ---------------------------------------------------------------------------
# Applicant pipeline
# ---------------------------------------------------------------------------
@router.get("/company/applications")
def applications(user: User = Depends(require_company), db: Session = Depends(get_db)):
    ids = _own_internship_ids(db, user)
    rows = (
        db.query(Application)
        .filter(Application.internship_id.in_(ids))
        .order_by(Application.applied_at.desc())
        .all()
        if ids
        else []
    )
    return {
        "items": [
            {
                "id": a.id,
                "status": a.status,
                "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                "cover_letter": a.cover_letter,
                "student": public_user(a.student),
                "internship": internship_payload(a.internship),
            }
            for a in rows
        ]
    }


class StageIn(BaseModel):
    stage: str


@router.post("/company/applications/{app_id}/stage")
def move_stage(app_id: int, data: StageIn, user: User = Depends(require_company), db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a or a.internship.company_id != _company(db, user).id:
        raise HTTPException(status_code=404, detail="Application not found")
    if data.stage not in APPLICATION_STAGES + ["rejected"]:
        raise HTTPException(status_code=400, detail="Invalid stage")
    a.status = data.stage
    hist = json.loads(a.stage_history) if a.stage_history else []
    hist.append({"stage": data.stage, "at": datetime.utcnow().isoformat()})
    a.stage_history = json.dumps(hist)
    db.commit()
    student = db.query(User).filter(User.id == a.student_id).first()
    label = data.stage.replace("_", " ")
    if data.stage == "rejected":
        notify(db, a.student_id, "Application status update", f"Your application for {a.internship.title} was rejected. Keep applying!", "warning")
    else:
        notify(db, a.student_id, f"Moved to {label}", f"Your application for {a.internship.title} moved to '{label}'.", "success" if data.stage in ("selected", "joined") else "info")
    log_action(db, user, "application_stage", f"{student.name} → {data.stage} for {a.internship.title}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Intern monitor
# ---------------------------------------------------------------------------
@router.get("/company/interns")
def interns(user: User = Depends(require_company), db: Session = Depends(get_db)):
    ids = _own_internship_ids(db, user)
    joined = (
        db.query(Application)
        .filter(Application.internship_id.in_(ids), Application.status == "joined")
        .all()
        if ids
        else []
    )
    items = []
    today = date.today()
    for a in joined:
        student = a.student
        tracker = (
            db.query(Tracker)
            .filter(Tracker.student_id == student.id, Tracker.status == "active")
            .first()
        )
        # attendance over last 30 days
        from datetime import timedelta

        start = today - timedelta(days=29)
        att = (
            db.query(Attendance)
            .filter(Attendance.student_id == student.id, Attendance.day >= start)
            .all()
        )
        pct = round(sum(1 for r in att if r.status == "present") / len(att) * 100) if att else 0
        reports_ok = (
            db.query(ReportDaily)
            .filter(ReportDaily.student_id == student.id, ReportDaily.status == "approved")
            .count()
        )
        fb = (
            db.query(Feedback)
            .filter(Feedback.company_id == user.id, Feedback.intern_id == student.id)
            .order_by(Feedback.created_at.desc())
            .first()
        )
        items.append(
            {
                "application_id": a.id,
                "student": public_user(student),
                "internship": a.internship.title,
                "tracker_company": tracker.company if tracker else a.internship.company.name,
                "attendance_pct": pct,
                "approved_reports": reports_ok,
                "streak": student.streak or 0,
                "feedback": {"rating": fb.rating, "comment": fb.comment} if fb else None,
            }
        )
    return {"items": items}


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


@router.post("/company/interns/{student_id}/feedback")
def give_feedback(student_id: int, data: FeedbackIn, user: User = Depends(require_company), db: Session = Depends(get_db)):
    ids = _own_internship_ids(db, user)
    is_intern = (
        db.query(Application)
        .filter(
            Application.internship_id.in_(ids),
            Application.student_id == student_id,
            Application.status.in_(["joined", "completed"]),
        )
        .first()
        if ids
        else None
    )
    if not is_intern:
        raise HTTPException(status_code=403, detail="This student is not your intern")
    fb = Feedback(company_id=user.id, intern_id=student_id, rating=data.rating, comment=data.comment or None)
    db.add(fb)
    db.commit()
    notify(db, student_id, "Company feedback", f"Your mentor at {user.company_name} rated your performance {data.rating}/5.", "info")
    log_action(db, user, "feedback", f"Feedback for intern #{student_id}")
    return {"ok": True}

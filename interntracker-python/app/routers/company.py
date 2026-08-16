"""Company endpoints: profile, internships, applications, intern monitoring."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (Application, Attendance, CompanyProfile, DailyReport, Enrollment, InternFeedback,
                      Internship, Notification, User, WeeklyReport)
from ..security import get_current_user, log_activity, notify, require_role

router = APIRouter(prefix="/api/company", tags=["company"])
company_only = require_role("company")

STAGES = ("applied", "under_review", "shortlisted", "interview", "selected", "rejected", "joined", "completed")


def _company(db: Session, cid: int) -> CompanyProfile:
    cp = db.query(CompanyProfile).filter_by(user_id=cid).first()
    if cp is None:
        raise HTTPException(400, "Company profile not set up")
    return cp


def _my_internship_ids(db: Session, cid: int):
    return [i.id for i in db.query(Internship).filter_by(company_id=cid).all()]


@router.get("/dashboard")
def dashboard(user: User = Depends(company_only), db: Session = Depends(get_db)):
    cp = _company(db, user.id)
    internships = db.query(Internship).filter_by(company_id=user.id).all()
    iids = [i.id for i in internships]
    apps = db.query(Application).filter(Application.internship_id.in_(iids)).all() if iids else []
    interns = []
    if iids:
        interns = db.query(Enrollment).filter(Enrollment.internship_id.in_(iids), Enrollment.status == "active").all()
    recent = sorted(apps, key=lambda a: a.applied_at or datetime.min, reverse=True)[:6]
    return {
        "verification_status": cp.verification_status,
        "stats": {"internships": len(internships), "open": sum(1 for i in internships if i.status == "open"),
                  "applications": len(apps), "shortlisted": sum(1 for a in apps if a.status == "shortlisted"),
                  "interviews": sum(1 for a in apps if a.status == "interview"),
                  "interns": len(interns)},
        "recent_applications": [{"id": a.id, "student": db.get(User, a.student_id).name,
                                 "title": a.internship.title if a.internship else "", "status": a.status,
                                 "applied_at": a.applied_at.isoformat() if a.applied_at else None} for a in recent],
    }


@router.get("/profile")
def profile(user: User = Depends(company_only), db: Session = Depends(get_db)):
    cp = _company(db, user.id)
    return {"name": cp.name, "official_email": cp.official_email, "website": cp.website,
            "industry": cp.industry, "location": cp.location, "description": cp.description,
            "registration_info": cp.registration_info, "docs": cp.docs or [], "logo_url": cp.logo_url,
            "verification_status": cp.verification_status,
            "verified_at": cp.verified_at.isoformat() if cp.verified_at else None}


class CompanyProfileIn(BaseModel):
    name: str = ""
    website: str = ""
    industry: str = ""
    location: str = ""
    description: str = ""
    logo_url: str = ""


@router.patch("/profile")
def update_profile(data: CompanyProfileIn, user: User = Depends(company_only), db: Session = Depends(get_db)):
    cp = _company(db, user.id)
    if data.name:
        cp.name = data.name
    cp.website = data.website or cp.website
    cp.industry = data.industry or cp.industry
    cp.location = data.location or cp.location
    cp.description = data.description or cp.description
    cp.logo_url = data.logo_url or cp.logo_url
    db.commit()
    return {"ok": True}


class VerifyRequestIn(BaseModel):
    registration_info: str = ""
    docs: list[str] = []


@router.post("/verify-request")
def submit_verification(user: User = Depends(company_only), db: Session = Depends(get_db)):
    cp = _company(db, user.id)
    cp.verification_status = "pending"
    db.commit()
    for admin in db.query(User).filter_by(role="admin").all():
        notify(db, admin.id, "Company verification requested", f"{cp.name} submitted for verification", "company")
    db.commit()
    log_activity(db, user.id, "company.verify_request", cp.name)
    db.commit()
    return {"ok": True}


class InternshipIn(BaseModel):
    title: str = Field(min_length=3)
    description: str = ""
    mode: str = "remote"
    location: str = ""
    paid: bool = True
    stipend: str = ""
    duration: str = "3 months"
    domain: str = ""
    skills: list[str] = []
    intern_type: str = "fulltime"
    deadline: date | None = None


@router.get("/internships")
def my_internships(user: User = Depends(company_only), db: Session = Depends(get_db)):
    rows = db.query(Internship).filter_by(company_id=user.id).order_by(Internship.posted_at.desc()).all()
    return {"items": [{"id": i.id, "title": i.title, "description": i.description, "mode": i.mode,
                       "location": i.location, "paid": i.paid, "stipend": i.stipend, "duration": i.duration,
                       "domain": i.domain, "skills": i.skills or [], "intern_type": i.intern_type,
                       "deadline": i.deadline.isoformat() if i.deadline else None, "status": i.status,
                       "applications": db.query(Application).filter_by(internship_id=i.id).count()} for i in rows]}


@router.post("/internships")
def create_internship(data: InternshipIn, user: User = Depends(company_only), db: Session = Depends(get_db)):
    i = Internship(company_id=user.id, title=data.title, description=data.description, mode=data.mode,
                   location=data.location, paid=data.paid, stipend=data.stipend, duration=data.duration,
                   domain=data.domain, skills=data.skills, intern_type=data.intern_type,
                   deadline=data.deadline, status="open")
    db.add(i)
    db.flush()
    for student in db.query(User).filter_by(role="student").all():
        notify(db, student.id, "New internship posted", f"{data.title} at {_company(db, user.id).name}", "internship")
    db.commit()
    log_activity(db, user.id, "company.post_internship", data.title)
    db.commit()
    return {"ok": True, "id": i.id}


@router.patch("/internships/{iid}")
def update_internship(iid: int, data: InternshipIn, user: User = Depends(company_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None or i.company_id != user.id:
        raise HTTPException(404, "Internship not found")
    for f in ("title", "description", "mode", "location", "stipend", "duration", "domain", "intern_type"):
        setattr(i, f, getattr(data, f))
    i.paid = data.paid
    i.skills = data.skills
    i.deadline = data.deadline
    db.commit()
    return {"ok": True}


@router.post("/internships/{iid}/close")
def close_internship(iid: int, user: User = Depends(company_only), db: Session = Depends(get_db)):
    i = db.get(Internship, iid)
    if i is None or i.company_id != user.id:
        raise HTTPException(404, "Internship not found")
    i.status = "closed" if i.status == "open" else "open"
    db.commit()
    return {"ok": True, "status": i.status}


@router.get("/applications")
def applications(internship_id: int | None = None, status: str = "",
                 user: User = Depends(company_only), db: Session = Depends(get_db)):
    iids = _my_internship_ids(db, user.id)
    query = db.query(Application).filter(Application.internship_id.in_(iids)).order_by(Application.applied_at.desc())
    if internship_id:
        query = query.filter(Application.internship_id == internship_id)
    if status:
        query = query.filter(Application.status == status)
    out = []
    for a in query.limit(200).all():
        student = db.get(User, a.student_id)
        out.append({"id": a.id, "student_id": a.student_id, "student": student.name,
                    "email": student.email, "internship_id": a.internship_id,
                    "title": a.internship.title if a.internship else "", "status": a.status,
                    "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                    "interview_date": a.interview_date.isoformat() if a.interview_date else None,
                    "notes": a.notes})
    return {"items": out}


class StageIn(BaseModel):
    status: str
    interview_date: date | None = None
    notes: str = ""


@router.post("/applications/{aid}/stage")
def set_stage(aid: int, data: StageIn, user: User = Depends(company_only), db: Session = Depends(get_db)):
    a = db.get(Application, aid)
    if a is None or a.internship_id not in _my_internship_ids(db, user.id):
        raise HTTPException(404, "Application not found")
    if data.status not in STAGES:
        raise HTTPException(400, "Invalid status")
    a.status = data.status
    a.interview_date = data.interview_date or a.interview_date
    a.notes = data.notes or a.notes
    db.commit()
    notify(db, a.student_id, f"Application update: {data.status}",
           f"Your application for '{a.internship.title if a.internship else ''}' is now {data.status}"
           + (f". Interview on {data.interview_date}" if data.interview_date else ""), "application")
    db.commit()
    log_activity(db, user.id, "company.application_stage", f"app {aid} -> {data.status}")
    db.commit()
    return {"ok": True}


@router.get("/interns")
def interns(user: User = Depends(company_only), db: Session = Depends(get_db)):
    iids = _my_internship_ids(db, user.id)
    rows = db.query(Enrollment).filter(Enrollment.internship_id.in_(iids)).order_by(Enrollment.created_at.desc()).all() if iids else []
    out = []
    for e in rows:
        student = db.get(User, e.student_id)
        att = db.query(Attendance).filter_by(student_id=e.student_id).all()
        present = sum(1 for a in att if a.status == "present")
        reports = db.query(DailyReport).filter_by(student_id=e.student_id).count()
        out.append({"id": e.id, "student_id": e.student_id, "name": student.name, "email": student.email,
                    "role": e.role, "company": e.company_name, "start_date": e.start_date.isoformat() if e.start_date else None,
                    "end_date": e.end_date.isoformat() if e.end_date else None, "mentor": e.mentor,
                    "status": e.status, "attendance_pct": round(present / max(len(att), 1) * 100),
                    "reports": reports, "feedback": [f.comment for f in db.query(InternFeedback).filter_by(enrollment_id=e.id).all()]})
    return {"items": out}


class FeedbackIn(BaseModel):
    rating: int = 5
    comment: str = ""


@router.post("/interns/{eid}/feedback")
def add_feedback(eid: int, data: FeedbackIn, user: User = Depends(company_only), db: Session = Depends(get_db)):
    e = db.get(Enrollment, eid)
    if e is None:
        raise HTTPException(404, "Intern not found")
    db.add(InternFeedback(company_id=user.id, enrollment_id=eid, rating=data.rating, comment=data.comment))
    db.commit()
    notify(db, e.student_id, "Feedback received", f"Your mentor at {e.company_name} left feedback: {data.comment[:120]}", "feedback")
    db.commit()
    return {"ok": True}


@router.post("/interns/{eid}/complete")
def complete_intern(eid: int, user: User = Depends(company_only), db: Session = Depends(get_db)):
    e = db.get(Enrollment, eid)
    if e is None:
        raise HTTPException(404, "Intern not found")
    e.status = "completed"
    db.commit()
    notify(db, e.student_id, "Internship completed 🎉", f"{e.company_name} marked your internship as completed.", "success")
    db.commit()
    log_activity(db, user.id, "company.complete_intern", f"enrollment {eid}")
    db.commit()
    return {"ok": True}

"""Authentication endpoints: register, login, me."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CompanyProfile, FacultyProfile, ROLES, StudentProfile, User
from ..security import create_token, get_current_user, hash_password, log_activity, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str
    # student
    department: str = ""
    branch: str = ""
    year: str = "1"
    semester: str = "1"
    cgpa: float = 0.0
    skills: list[str] = []
    college: str = ""
    # faculty
    designation: str = "Assistant Professor"
    # company
    company_name: str = ""
    industry: str = ""
    website: str = ""
    location: str = ""
    description: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if data.role not in ROLES:
        raise HTTPException(400, "Invalid role")
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(409, "An account with this email already exists")

    user = User(name=data.name.strip(), email=data.email.lower(),
                password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    db.flush()

    if data.role == "student":
        db.add(StudentProfile(user_id=user.id, college=data.college, department=data.department,
                              branch=data.branch, year=data.year, semester=data.semester,
                              cgpa=data.cgpa, skills=data.skills))
    elif data.role == "faculty":
        db.add(FacultyProfile(user_id=user.id, department=data.department, designation=data.designation))
    elif data.role == "company":
        db.add(CompanyProfile(user_id=user.id, name=data.company_name or data.name,
                              official_email=data.email, industry=data.industry,
                              website=data.website, location=data.location,
                              description=data.description, verification_status="pending"))

    db.commit()
    log_activity(db, user.id, "auth.register", f"{data.role} registered")
    return {"token": create_token(user), "user": _public_user(db, user)}


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    log_activity(db, user.id, "auth.login", f"{user.role} logged in")
    return {"token": create_token(user), "user": _public_user(db, user)}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _public_user(db, user)


def _public_user(db: Session, user: User) -> dict:
    profile = None
    if user.role == "student":
        p = db.query(StudentProfile).filter_by(user_id=user.id).first()
        if p:
            profile = {
                "college": p.college, "department": p.department, "branch": p.branch,
                "year": p.year, "semester": p.semester, "cgpa": p.cgpa, "skills": p.skills or [],
                "bio": p.bio, "photo_url": p.photo_url, "resume_url": p.resume_url,
                "mentor_id": p.mentor_id, "points": p.points, "badges": p.badges or [],
                "current_streak": p.current_streak, "longest_streak": p.longest_streak,
            }
    elif user.role == "faculty":
        p = db.query(FacultyProfile).filter_by(user_id=user.id).first()
        if p:
            profile = {"department": p.department, "designation": p.designation}
    elif user.role == "company":
        p = db.query(CompanyProfile).filter_by(user_id=user.id).first()
        if p:
            profile = {
                "name": p.name, "official_email": p.official_email, "website": p.website,
                "industry": p.industry, "location": p.location, "description": p.description,
                "registration_info": p.registration_info, "docs": p.docs or [],
                "logo_url": p.logo_url, "verification_status": p.verification_status,
            }
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None, "profile": profile}

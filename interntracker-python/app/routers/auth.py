"""Auth endpoints: register, login, me, forgot password."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Company, StudentProfile, User
from ..security import (
    create_token,
    get_current_user,
    hash_password,
    log_action,
    public_user,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

ROLES = {"student", "faculty", "admin", "company"}


class RegisterIn(BaseModel):
    role: str
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)
    # student extras
    department: str = ""
    branch: str = ""
    year: str = ""
    cgpa: float | None = None
    phone: str = ""
    location: str = ""
    # company extras
    company_name: str = ""
    company_website: str = ""
    company_industry: str = ""
    company_description: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=6)


@router.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    role = data.role.lower().strip()
    if role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        role=role,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        department=data.department or None,
        branch=data.branch or None,
        year=data.year or None,
        cgpa=data.cgpa,
        phone=data.phone or None,
        location=data.location or None,
        company_name=data.company_name or None,
        company_website=data.company_website or None,
        company_industry=data.company_industry or None,
        company_description=data.company_description or None,
    )
    db.add(user)
    db.flush()

    if role == "student":
        profile = StudentProfile(
            user_id=user.id,
            department=data.department or None,
            branch=data.branch or None,
            year=data.year or None,
            cgpa=data.cgpa,
            phone=data.phone or None,
            location=data.location or None,
        )
        db.add(profile)
        user.profile_completed = bool(data.department and data.branch)
    elif role == "company":
        comp = Company(
            user_id=user.id,
            name=data.company_name or data.name,
            website=data.company_website or None,
            industry=data.company_industry or None,
            description=data.company_description or None,
            status="pending",
        )
        db.add(comp)
        user.company_name = comp.name
        user.verification_status = "pending"

    db.commit()
    db.refresh(user)
    log_action(db, user, "registered", f"New {role} account")
    return {"token": create_token(user), "user": public_user(user)}


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")
    return {"token": create_token(user), "user": public_user(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return public_user(user)


@router.post("/forgot")
def forgot(data: ForgotIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        # Don't reveal whether the email exists
        return {"ok": True}
    user.password_hash = hash_password(data.new_password)
    db.commit()
    log_action(db, user, "password_reset", "Password reset via forgot-password")
    return {"ok": True}

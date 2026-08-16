"""Auth primitives: bcrypt hashing, JWT tokens, role guards, helpers."""
import json
from datetime import datetime, timedelta
from functools import wraps

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .config import JWT_ALGO, SECRET_KEY, TOKEN_EXPIRE_DAYS
from .database import get_db
from .models import ActivityLog, Notification, Reward, User


# ---------------------------------------------------------------------------
# Password + token helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
def get_current_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(authorization[7:])
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account not found or disabled")
    return user


def require_roles(*roles):
    """Dependency factory: only allow the given roles."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="You don't have access to this feature")
        return user

    return checker


require_student = require_roles("student")
require_faculty = require_roles("faculty", "admin")
require_admin = require_roles("admin")
require_company = require_roles("company")


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def notify(db: Session, user_id: int, title: str, message: str, ntype: str = "info"):
    db.add(Notification(user_id=user_id, title=title, message=message, type=ntype))
    db.commit()


def log_action(db: Session, user: User, action: str, details: str = ""):
    db.add(
        ActivityLog(
            user_id=user.id,
            actor_name=user.name,
            action=action,
            details=details,
        )
    )
    db.commit()


def public_user(u: User) -> dict:
    """Safe user summary for the API."""
    return {
        "id": u.id,
        "role": u.role,
        "name": u.name,
        "email": u.email,
        "avatar": u.avatar or (u.name[0].upper() if u.name else "U"),
        "company_name": u.company_name,
        "verified": u.verified,
        "verification_status": u.verification_status,
        "points": u.points or 0,
        "streak": u.streak or 0,
        "department": u.department,
        "branch": u.branch,
        "year": u.year,
        "cgpa": u.cgpa,
        "profile_completed": bool(u.profile_completed),
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def company_payload(c) -> dict:
    return {
        "id": c.id,
        "user_id": c.user_id,
        "name": c.name,
        "website": c.website,
        "industry": c.industry,
        "description": c.description,
        "location": c.location,
        "status": c.status,
        "logo": c.logo,
    }


def internship_payload(i, company=None, applied=False, saved=False, distance=None) -> dict:
    comp = company or (i.company if i.company else None)
    return {
        "id": i.id,
        "title": i.title,
        "description": i.description,
        "domain": i.domain,
        "location": i.location,
        "mode": i.mode,
        "duration_months": i.duration_months,
        "stipend": i.stipend,
        "paid": bool(i.paid),
        "skills": (i.skills or "").split(",") if i.skills else [],
        "seats": i.seats,
        "deadline": i.deadline.isoformat() if i.deadline else None,
        "status": i.status,
        "posted_at": i.posted_at.isoformat() if i.posted_at else None,
        "company": {
            "id": comp.id,
            "name": comp.name,
            "verified": bool(comp.user.verified) if comp.user else False,
        }
        if comp
        else None,
        "applied": applied,
        "saved": saved,
        "distance": distance,
    }


def add_points(db: Session, user: User, points: int, reason: str, badge: str = ""):
    user.points = (user.points or 0) + points
    db.add(Reward(user_id=user.id, points=points, reason=reason, badge=badge))
    db.commit()


def update_streak(db: Session, user: User, today: datetime | None = None):
    """Keep streak: consecutive days with activity. Called on check-in/report."""
    from .models import Attendance

    today = today or datetime.utcnow()
    if user.last_active_date == today.date():
        return
    from datetime import date, timedelta

    yesterday = today.date() - timedelta(days=1)
    if user.last_active_date == yesterday:
        user.streak = (user.streak or 0) + 1
    else:
        user.streak = 1
    user.last_active_date = today.date()
    db.commit()

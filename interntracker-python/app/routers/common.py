"""Shared endpoints: notifications, announcements, leaderboard, uploads."""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import UPLOAD_DIR
from ..database import get_db
from ..models import Announcement, Notification, User
from ..security import get_current_user, public_user

router = APIRouter(prefix="/api", tags=["common"])


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@router.get("/notifications")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "read": bool(n.read),
            "created_at": n.created_at.isoformat(),
        }
        for n in items
    ]


@router.post("/notifications/read")
def mark_notifications_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read.is_(False)).update(
        {"read": True}
    )
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
@router.get("/announcements")
def list_announcements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(10).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "audience": a.audience,
            "created_at": a.created_at.isoformat(),
        }
        for a in items
    ]


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------
@router.get("/leaderboard")
def leaderboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    students = (
        db.query(User)
        .filter(User.role == "student", User.is_active.is_(True))
        .order_by(User.points.desc())
        .limit(50)
        .all()
    )
    rows = []
    for idx, s in enumerate(students, start=1):
        rows.append(
            {
                "rank": idx,
                "name": s.name,
                "points": s.points or 0,
                "streak": s.streak or 0,
                "department": s.department,
                "avatar": s.avatar or s.name[0].upper(),
                "is_me": s.id == user.id,
            }
        )
    return {"rows": rows}


# ---------------------------------------------------------------------------
# File uploads (offer letters, resumes, certificates, company docs)
# ---------------------------------------------------------------------------
@router.post("/upload")
def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"}:
        raise HTTPException(status_code=400, detail="Only pdf/png/jpg/doc files are allowed")
    fname = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / fname
    with open(dest, "wb") as fh:
        fh.write(file.file.read())
    return {"path": f"/uploads/{fname}", "name": file.filename or fname}


# ---------------------------------------------------------------------------
# Activity log (admin)
# ---------------------------------------------------------------------------
@router.get("/activity")
def activity(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    from ..models import ActivityLog

    items = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(50).all()
    return [
        {
            "actor": a.actor_name,
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
        }
        for a in items
    ]

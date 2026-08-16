"""Shared endpoints: notifications, announcements, leaderboard, uploads."""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..models import Announcement, Notification, StudentProfile, User
from ..security import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["common"])


def _notif_dict(n: Notification) -> dict:
    return {"id": n.id, "title": n.title, "body": n.body, "type": n.ntype,
            "read": n.read, "created_at": n.created_at.isoformat() if n.created_at else None}


@router.get("/notifications")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    unread = db.query(Notification).filter_by(user_id=user.id, read=False).count()
    return {"items": [_notif_dict(n) for n in items], "unread": unread}


@router.post("/notifications/{nid}/read")
def mark_read(nid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if n and n.user_id == user.id:
        n.read = True
        db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter_by(user_id=user.id, read=False).update({"read": True})
    db.commit()
    return {"ok": True}


@router.get("/announcements")
def list_announcements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(10).all()
    return {"items": [{"id": a.id, "title": a.title, "body": a.body,
                       "created_at": a.created_at.isoformat() if a.created_at else None} for a in items]}


@router.get("/leaderboard")
def leaderboard(department: str = "", period: str = "all", user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    q = db.query(StudentProfile, User).join(User, User.id == StudentProfile.user_id)
    if department:
        q = q.filter(StudentProfile.department == department)
    rows = q.order_by(StudentProfile.points.desc()).limit(50).all()
    out = []
    for i, (sp, u) in enumerate(rows, start=1):
        out.append({
            "rank": i, "student_id": sp.user_id, "name": u.name, "department": sp.department,
            "points": sp.points, "streak": sp.current_streak, "longest_streak": sp.longest_streak,
            "cgpa": sp.cgpa, "badges": len(sp.badges or []),
        })
    return {"items": out}


@router.post("/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower()[:10]
    if not ext:
        ext = ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(config.UPLOAD_DIR, name)
    content = await file.read()
    if len(content) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {config.MAX_UPLOAD_MB} MB)")
    with open(dest, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{name}", "name": file.filename}

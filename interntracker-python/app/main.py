"""InternTracker — FastAPI entrypoint.

Run:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import STATIC_DIR, UPLOAD_DIR
from .database import Base, SessionLocal, engine
from .routers import admin, auth, common, company, faculty, student

app = FastAPI(title="InternTracker", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from .seed import seed

        seed(db)
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(common.router)
app.include_router(student.router)
app.include_router(faculty.router)
app.include_router(admin.router)
app.include_router(company.router)


@app.get("/api/health")
def health():
    return {"ok": True, "app": "InternTracker"}


# ---------------------------------------------------------------------------
# Static frontend (plain HTML/CSS/JS) — served manually because the
# catch-all SPA route below would otherwise shadow Starlette mounts.
# ---------------------------------------------------------------------------
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PAGES = {
    "": "index.html",
    "student": "student.html",
    "faculty": "faculty.html",
    "admin": "admin.html",
    "company": "company.html",
}


def _safe_join(root, rel):
    """Resolve a relative file path inside root, blocking traversal."""
    target = (root / rel).resolve()
    if root.resolve() not in target.parents and target != root.resolve():
        return None
    return target if target.exists() and target.is_file() else None


@app.get("/{path:path}", include_in_schema=False)
def serve_page(path: str):
    if path.startswith("static/"):
        target = _safe_join(STATIC_DIR, path[len("static/"):])
        return FileResponse(target) if target else JSONResponse(status_code=404, content={"detail": "Not found"})
    if path.startswith("uploads/"):
        target = _safe_join(UPLOAD_DIR, path[len("uploads/"):])
        return FileResponse(target) if target else JSONResponse(status_code=404, content={"detail": "Not found"})
    # role workspaces + deep links
    if path in PAGES:
        return FileResponse(STATIC_DIR / PAGES[path])
    if path.startswith(("student/", "faculty/", "admin/", "company/")):
        role = path.split("/")[0]
        return FileResponse(STATIC_DIR / f"{role}.html")
    return JSONResponse(status_code=404, content={"detail": "Not found"})

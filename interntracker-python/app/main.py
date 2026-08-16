"""InternTracker - FastAPI application entrypoint.

Run locally:
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000
Then open http://localhost:8000
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .database import Base, SessionLocal, engine
from .routers import admin, auth, common, company, faculty, student

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")


def init_db_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from .seed import seed_if_empty
        seed_if_empty(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_and_seed()
    yield


app = FastAPI(title="InternTracker", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(common.router)
app.include_router(student.router)
app.include_router(faculty.router)
app.include_router(admin.router)
app.include_router(company.router)

# uploaded files
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

# frontend static assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# simple page routes (must be registered after /static and /uploads)
PAGES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/student": "student.html",
    "/faculty": "faculty.html",
    "/admin": "admin.html",
    "/company": "company.html",
}


@app.get("/{page_path:path}", include_in_schema=False, response_class=HTMLResponse)
def serve_page(page_path: str):
    fname = PAGES.get("/" + page_path if page_path else "/", "index.html")
    path = os.path.join(STATIC_DIR, fname)
    if not os.path.exists(path):
        raise HTTPException(404, "Frontend not built")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

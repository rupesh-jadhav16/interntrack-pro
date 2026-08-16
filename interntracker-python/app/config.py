"""Central configuration for InternTracker."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Default to local PostgreSQL. Override with DATABASE_URL env var.
# SQLite fallback: sqlite:///./interntracker.db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/interntracker",
)

SECRET_KEY = os.getenv("SECRET_KEY", "interntracker-dev-secret-change-me")
JWT_ALGO = "HS256"
TOKEN_EXPIRE_DAYS = 7

COLLEGE_NAME = os.getenv("COLLEGE_NAME", "Greenfield Institute of Technology")

UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"

# Default reward point values (admin can tweak via /api/admin/reward-config)
REWARD_DEFAULTS = {
    "daily_report": 10,
    "weekly_report": 50,
    "attendance_day": 5,
    "internship_completed": 200,
    "certificate_verified": 100,
}

# Application pipeline stages in order
APPLICATION_STAGES = [
    "applied",
    "under_review",
    "shortlisted",
    "interview",
    "selected",
    "joined",
    "completed",
]
REJECTED = "rejected"

INTERNSHIP_MODES = ["remote", "onsite", "hybrid", "wfh"]
INTERNSHIP_TYPES = ["on-campus", "off-campus", "college-provided", "self-found"]

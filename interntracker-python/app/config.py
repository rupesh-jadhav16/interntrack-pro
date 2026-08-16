"""Central configuration. Every value can be overridden with environment variables."""
import os

# --- Database -------------------------------------------------------------
# Default to local PostgreSQL. Override with DATABASE_URL if you use another
# database/user/password. Example:
#   DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/interntracker
# For a zero-setup quick demo you can use SQLite instead:
#   DATABASE_URL=sqlite:///./interntracker.db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/interntracker",
)

# JWT secret - CHANGE THIS in production
SECRET_KEY = os.getenv("SECRET_KEY", "interntracker-hackathon-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

# Uploads
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
MAX_UPLOAD_MB = 5

# College shown across the app
COLLEGE_NAME = os.getenv("COLLEGE_NAME", "Springfield Institute of Technology")

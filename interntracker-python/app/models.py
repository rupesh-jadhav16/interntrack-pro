"""SQLAlchemy models for InternTracker.

Tables:
    users, student_profiles, companies, internships, applications,
    saved_internships, trackers, reports_daily, reports_weekly,
    attendance, notifications, announcements, certificates, rewards,
    reward_config, feedback, activity_log, mentors
"""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    role = Column(String(20), nullable=False, index=True)  # student|faculty|admin|company
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    avatar = Column(String(20), default="U")
    created_at = Column(DateTime, default=now)

    # company-specific
    company_name = Column(String(255))
    company_website = Column(String(255))
    company_industry = Column(String(120))
    company_description = Column(Text)
    verified = Column(Boolean, default=False)  # verified company badge
    verification_status = Column(String(20), default="pending")  # pending|verified|rejected
    verification_note = Column(Text)

    # faculty-specific
    faculty_department = Column(String(120))
    faculty_designation = Column(String(120))

    # student-specific (also mirrored in student_profiles for richer data)
    department = Column(String(120))
    branch = Column(String(120))
    year = Column(String(30))
    cgpa = Column(Float)
    phone = Column(String(30))
    location = Column(String(120))
    resume_path = Column(String(255))
    points = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_active_date = Column(Date)

    profile_completed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    mentor_id = Column(Integer, ForeignKey("users.id"))

    student_profile = relationship("StudentProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    company = relationship(
        "Company", uselist=False, back_populates="user",
        foreign_keys="Company.user_id", cascade="all, delete-orphan",
    )
    mentor = relationship("User", remote_side=[id], foreign_keys=[mentor_id])


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department = Column(String(120))
    branch = Column(String(120))
    year = Column(String(30))
    cgpa = Column(Float)
    phone = Column(String(30))
    location = Column(String(120))
    skills = Column(Text)  # comma separated
    bio = Column(Text)
    linkedin = Column(String(255))
    github = Column(String(255))
    resume_path = Column(String(255))

    user = relationship("User", back_populates="student_profile")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    website = Column(String(255))
    industry = Column(String(120))
    description = Column(Text)
    logo = Column(String(255))
    location = Column(String(120))
    status = Column(String(20), default="pending")  # pending|verified|rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    docs = Column(String(255))
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="company", foreign_keys=[user_id])
    internships = relationship("Internship", back_populates="company")


class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    domain = Column(String(120), index=True)
    location = Column(String(120))
    latitude = Column(Float)
    longitude = Column(Float)
    mode = Column(String(30), default="remote")  # remote|onsite|hybrid|wfh
    duration_months = Column(Integer, default=3)
    stipend = Column(String(120), default="Unpaid")
    paid = Column(Boolean, default=False)
    skills = Column(Text)  # comma separated
    seats = Column(Integer, default=1)
    deadline = Column(Date)
    status = Column(String(20), default="open")  # open|closed
    posted_at = Column(DateTime, default=now)

    company = relationship("Company", back_populates="internships")
    applications = relationship("Application", back_populates="internship", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_app_student_internship"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False, index=True)
    status = Column(String(30), default="applied", index=True)
    applied_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)
    cover_letter = Column(Text)
    stage_history = Column(Text)  # JSON array of {stage, at}

    student = relationship("User", foreign_keys=[student_id])
    internship = relationship("Internship", back_populates="applications")


class SavedInternship(Base):
    __tablename__ = "saved_internships"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_saved_student_internship"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    saved_at = Column(DateTime, default=now)

    internship = relationship("Internship", foreign_keys=[internship_id])


class Tracker(Base):
    __tablename__ = "trackers"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"))  # optional
    type = Column(String(30), default="self-found")  # on-campus|off-campus|college-provided|self-found

    internship = relationship("Internship", foreign_keys=[internship_id])
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    mentor_name = Column(String(255))
    mentor_email = Column(String(255))
    mode = Column(String(30), default="onsite")
    location = Column(String(120))
    offer_letter_path = Column(String(255))
    status = Column(String(20), default="active")  # active|completed
    created_at = Column(DateTime, default=now)


class ReportDaily(Base):
    __tablename__ = "reports_daily"
    __table_args__ = (UniqueConstraint("student_id", "report_date", name="uq_report_daily"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_date = Column(Date, default=date.today)
    content = Column(Text, nullable=False)
    hours = Column(Float, default=0)
    status = Column(String(20), default="pending")  # pending|approved|rejected
    feedback = Column(Text)
    points = Column(Integer, default=0)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)


class ReportWeekly(Base):
    __tablename__ = "reports_weekly"
    __table_args__ = (UniqueConstraint("student_id", "week_label", name="uq_report_weekly"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_label = Column(String(30), nullable=False)  # e.g. 2026-W33
    content = Column(Text, nullable=False)
    highlights = Column(Text)
    status = Column(String(20), default="pending")
    feedback = Column(Text)
    points = Column(Integer, default=0)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("student_id", "day", name="uq_attendance_day"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    day = Column(Date, default=date.today)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    hours = Column(Float, default=0)
    status = Column(String(20), default="present")  # present|absent
    note = Column(Text)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    type = Column(String(30), default="info")  # info|success|warning|danger|system
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now)


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    audience = Column(String(30), default="all")  # all|students|faculty|companies
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tracker_id = Column(Integer, ForeignKey("trackers.id"))
    code = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255))
    issued_by = Column(String(255))
    status = Column(String(20), default="pending")  # pending|approved|rejected
    authenticity_score = Column(Integer, default=0)
    doc_path = Column(String(255))
    review_note = Column(Text)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=now)


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge = Column(String(120))
    reason = Column(String(255), nullable=False)
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)


class RewardConfig(Base):
    __tablename__ = "reward_config"

    key = Column(String(60), primary_key=True)
    label = Column(String(120), nullable=False)
    value = Column(Integer, nullable=False)


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    intern_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, default=5)
    comment = Column(Text)
    created_at = Column(DateTime, default=now)


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    actor_name = Column(String(255))
    action = Column(String(120), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime, default=now)


class Mentor(Base):
    __tablename__ = "mentors"
    __table_args__ = (UniqueConstraint("student_id", "faculty_id", name="uq_mentor_pair"),)

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=now)

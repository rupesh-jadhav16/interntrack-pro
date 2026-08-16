"""SQLAlchemy models for InternTracker."""
from datetime import datetime, date

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from .database import Base

ROLES = ("student", "faculty", "admin", "company")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False,
                                  foreign_keys="StudentProfile.user_id")
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)
    company_profile = relationship("CompanyProfile", back_populates="user", uselist=False)


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    college = Column(String(160), default="")
    department = Column(String(120), default="")
    branch = Column(String(120), default="")
    year = Column(String(20), default="1")
    semester = Column(String(20), default="1")
    cgpa = Column(Float, default=0.0)
    skills = Column(JSON, default=list)
    bio = Column(Text, default="")
    photo_url = Column(String(300), default="")
    resume_url = Column(String(300), default="")
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    points = Column(Integer, default=0)
    badges = Column(JSON, default=list)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_report_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    mentor = relationship("User", foreign_keys=[mentor_id])


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    department = Column(String(120), default="")
    designation = Column(String(120), default="Assistant Professor")

    user = relationship("User", back_populates="faculty_profile")


class CompanyProfile(Base):
    __tablename__ = "company_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    name = Column(String(160), nullable=False)
    official_email = Column(String(160), default="")
    website = Column(String(200), default="")
    industry = Column(String(120), default="")
    location = Column(String(160), default="")
    description = Column(Text, default="")
    registration_info = Column(String(300), default="")
    docs = Column(JSON, default=list)
    logo_url = Column(String(300), default="")
    verification_status = Column(String(20), default="pending")  # pending|verified|rejected|suspended
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, nullable=True)

    user = relationship("User", back_populates="company_profile")


class Internship(Base):
    __tablename__ = "internships"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    mode = Column(String(20), default="remote")  # remote|onsite|hybrid
    location = Column(String(160), default="")
    paid = Column(Boolean, default=True)
    stipend = Column(String(80), default="")
    duration = Column(String(60), default="3 months")
    domain = Column(String(120), default="")
    skills = Column(JSON, default=list)
    intern_type = Column(String(20), default="fulltime")  # fulltime|parttime|summer|wfh
    deadline = Column(Date, nullable=True)
    status = Column(String(20), default="open", index=True)  # open|closed
    posted_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)

    company = relationship("User", foreign_keys=[company_id])


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_app_student_internship"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False, index=True)
    status = Column(String(20), default="applied", index=True)
    # applied|under_review|shortlisted|interview|selected|rejected|joined|completed
    interview_date = Column(Date, nullable=True)
    notes = Column(Text, default="")
    applied_at = Column(DateTime, default=datetime.utcnow)

    internship = relationship("Internship")


class Enrollment(Base):
    """A student's active/completed internship tracking workspace."""
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=True)
    company_name = Column(String(160), default="")
    role = Column(String(160), default="")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    mentor = Column(String(160), default="")
    mode = Column(String(20), default="remote")
    location = Column(String(160), default="")
    intern_type = Column(String(30), default="off_campus")  # on_campus|off_campus|college_provided|self_found
    status = Column(String(20), default="active")  # active|completed
    offer_letter_url = Column(String(300), default="")
    certificate_url = Column(String(300), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    internship = relationship("Internship")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=True)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="present")  # present|absent|leave|holiday|pending
    check_in = Column(String(10), default="")
    check_out = Column(String(10), default="")
    hours = Column(Float, default=0.0)
    summary = Column(Text, default="")
    tasks = Column(JSON, default=list)
    verified = Column(Boolean, default=False)


class DailyReport(Base):
    __tablename__ = "daily_reports"
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_daily_student_date"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    tasks = Column(Text, default="")
    learned = Column(Text, default="")
    problems = Column(Text, default="")
    plan = Column(Text, default="")
    hours = Column(Float, default=0.0)
    status = Column(String(20), default="pending")  # pending|approved|rejected
    feedback = Column(Text, default="")
    reviewed_by = Column(Integer, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    __table_args__ = (UniqueConstraint("student_id", "week_start", name="uq_weekly_student_week"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(Date, nullable=False)
    total_days = Column(Integer, default=0)
    attendance_pct = Column(Float, default=0.0)
    total_hours = Column(Float, default=0.0)
    tasks = Column(Text, default="")
    skills = Column(Text, default="")
    problems = Column(Text, default="")
    progress = Column(Integer, default=0)  # 0-100
    status = Column(String(20), default="pending")
    feedback = Column(Text, default="")
    submitted_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), default="")
    body = Column(Text, default="")
    ntype = Column(String(40), default="info")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), default="")
    cert_type = Column(String(60), default="internship")  # internship|offer|completion|experience
    file_url = Column(String(300), default="")
    company_name = Column(String(160), default="")
    notes = Column(Text, default="")
    score = Column(Integer, default=50)  # 0-100 authenticity score
    status = Column(String(20), default="review")  # verified|review|suspicious
    indicators = Column(JSON, default=list)
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedInternship(Base):
    __tablename__ = "saved_internships"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_saved_student_internship"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    internship = relationship("Internship")


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, default="")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RewardLog(Base):
    __tablename__ = "reward_logs"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    points = Column(Integer, default=0)
    reason = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class InternFeedback(Base):
    __tablename__ = "intern_feedback"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    rating = Column(Integer, default=0)  # 1-5
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, nullable=True, index=True)
    action = Column(String(120), default="")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

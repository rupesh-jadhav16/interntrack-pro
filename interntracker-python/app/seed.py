"""Seed demo data so every dashboard looks populated on first run.

Runs automatically on startup when the users table is empty.
Demo logins (all password "demo123" except where noted):
  student@college.edu        - star student (active internship, full activity)
  faculty@college.edu        - faculty mentor
  admin@college.edu          - T&P Cell admin
  techflowsystems@demo.com   - verified company
  nextgenrobotics@demo.com   - pending-verification company
"""
import random
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .models import (
    ActivityLog, Announcement, Application, Attendance, Certificate, CompanyProfile, DailyReport,
    Enrollment, FacultyProfile, Internship, Notification, RewardLog, SavedInternship,
    StudentProfile, User, WeeklyReport,
)
from .security import hash_password, notify

random.seed(42)


def _user(db, name, email, password, role):
    u = User(name=name, email=email, password_hash=hash_password(password), role=role)
    db.add(u)
    db.flush()
    return u


def _company(db, name, industry, location, status, desc, website=""):
    u = _user(db, name, f"{name.lower().replace(' ', '')}@demo.com", "company123", "company")
    cp = CompanyProfile(user_id=u.id, name=name, official_email=u.email, website=website or f"https://{name.lower().replace(' ', '')}.com",
                        industry=industry, location=location, description=desc, verification_status=status,
                        verified_at=datetime.utcnow() if status == "verified" else None)
    db.add(cp)
    return u


def _internship(db, company, title, domain, mode, location, paid, stipend, duration, skills, deadline_in, intern_type="fulltime"):
    i = Internship(company_id=company.id, title=title, domain=domain, mode=mode, location=location,
                   paid=paid, stipend=stipend, duration=duration, skills=skills,
                   deadline=date.today() + timedelta(days=deadline_in), status="open",
                   posted_at=datetime.utcnow() - timedelta(days=random.randint(2, 20)), intern_type=intern_type)
    db.add(i)
    db.flush()
    return i


def seed_if_empty(db: Session):
    if db.query(User).count() > 0:
        return

    # ---- staff ------------------------------------------------------------
    admin = _user(db, "Rohan Verma", "admin@college.edu", "admin123", "admin")
    faculty = _user(db, "Dr. Meera Sharma", "faculty@college.edu", "faculty123", "faculty")
    db.add(FacultyProfile(user_id=faculty.id, department="Computer Science", designation="Associate Professor"))

    # ---- companies --------------------------------------------------------
    techflow = _company(db, "TechFlow Systems", "Software", "Bengaluru", "verified",
                        "Product engineering studio building web platforms for edtech and fintech.")
    quanta = _company(db, "Quantum Metrics", "Data & Analytics", "Pune", "verified",
                      "Data analytics consulting with a focus on dashboards and ML pipelines.")
    innovax = _company(db, "InnovateX Corp", "Product", "Hyderabad", "verified",
                       "Consumer product lab shipping mobile and web experiences.")
    nextgen = _company(db, "NextGen Robotics", "Robotics / IoT", "Chennai", "pending",
                       "Robotics startup working on industrial automation. Verification in progress.")
    cloudnine = _company(db, "CloudNine Digital", "Marketing Tech", "Remote", "verified",
                         "Remote-first marketing automation company.")
    greenfield = _company(db, "GreenField AgriTech", "AgriTech", "Nagpur", "rejected",
                          "Agritech venture (registration docs incomplete).")

    # ---- internships ------------------------------------------------------
    skills = {
        "frontend": ["React", "TypeScript", "Tailwind", "CSS"],
        "backend": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "data": ["Python", "SQL", "Pandas", "Power BI"],
        "ml": ["Python", "TensorFlow", "Scikit-learn", "NLP"],
        "ux": ["Figma", "User Research", "Prototyping"],
        "iot": ["Arduino", "C++", "Raspberry Pi", "Sensors"],
    }
    _internship(db, techflow, "Software Engineering Intern", "Software", "remote", "Bengaluru (Remote)",
                True, "₹25,000 / month", "6 months", skills["frontend"] + skills["backend"], 18, "fulltime")
    _internship(db, techflow, "Frontend Developer Intern", "Frontend", "hybrid", "Bengaluru",
                True, "₹20,000 / month", "3 months", skills["frontend"], 12)
    _internship(db, quanta, "Data Analytics Intern", "Data Science", "remote", "Pune (Remote)",
                True, "₹22,000 / month", "4 months", skills["data"], 20)
    _internship(db, quanta, "ML Research Intern", "Machine Learning", "onsite", "Pune",
                False, "Certificate + stipend", "6 months", skills["ml"], 25)
    _internship(db, innovax, "UX Research Intern", "Design", "onsite", "Hyderabad",
                True, "₹18,000 / month", "3 months", skills["ux"], 10)
    _internship(db, innovax, "Product Management Intern", "Product", "hybrid", "Hyderabad",
                True, "₹20,000 / month", "4 months", ["Product", "Analytics", "Jira"], 15)
    _internship(db, cloudnine, "Digital Marketing Intern", "Marketing", "remote", "Remote (India)",
                True, "₹12,000 / month", "3 months", ["SEO", "Content", "Meta Ads"], 8, "parttime")
    _internship(db, cloudnine, "Backend Engineering Intern", "Backend", "remote", "Remote (India)",
                True, "₹24,000 / month", "6 months", skills["backend"], 22)
    _internship(db, nextgen, "Robotics Automation Intern", "Robotics", "onsite", "Chennai",
                True, "₹15,000 / month", "4 months", skills["iot"], 30)
    _internship(db, nextgen, "Embedded Systems Intern", "Embedded", "hybrid", "Chennai",
                True, "₹16,000 / month", "3 months", ["C", "Embedded C", "RTOS"], 14, "summer")

    # ---- students ---------------------------------------------------------
    star = _user(db, "Aarav Mehta", "student@college.edu", "student123", "student")
    star_p = StudentProfile(user_id=star.id, college="Springfield Institute of Technology",
                            department="Computer Science", branch="CSE", year="3", semester="6",
                            cgpa=8.7, skills=["Python", "React", "SQL", "FastAPI"],
                            bio="Final-year CSE student passionate about full-stack and data engineering.",
                            mentor_id=faculty.id, points=1240)
    db.add(star_p)

    others = [
        ("Ishita Rao", "ishita@college.edu", "Computer Science", "CSE", 8.9, ["Python", "ML", "SQL"], 980, 21),
        ("Karan Joshi", "karan@college.edu", "Electronics", "ECE", 7.8, ["C++", "Embedded", "IoT"], 610, 12),
        ("Sneha Patil", "sneha@college.edu", "Computer Science", "CSE", 9.1, ["React", "UI/UX", "Figma"], 1520, 34),
        ("Rahul Sharma", "rahul@college.edu", "Mechanical", "MECH", 7.2, ["CAD", "SolidWorks"], 320, 0),
        ("Priya Nair", "priya@college.edu", "Computer Science", "AIML", 8.4, ["Python", "NLP", "TensorFlow"], 740, 9),
    ]
    other_profiles = []
    for name, email, dept, branch, cgpa, sk, pts, streak in others:
        u = _user(db, name, email, "demo123", "student")
        p = StudentProfile(user_id=u.id, college="Springfield Institute of Technology", department=dept,
                           branch=branch, year="3" if dept != "Mechanical" else "4", semester="6" if dept != "Mechanical" else "8",
                           cgpa=cgpa, skills=sk, mentor_id=faculty.id, points=pts,
                           current_streak=streak, longest_streak=max(streak, 14))
        db.add(p)
        other_profiles.append(p)

    # ---- star student activity -------------------------------------------
    # applications
    internships = db.query(Internship).all()
    t1 = internships[0]
    t2 = internships[2]
    a1 = Application(student_id=star.id, internship_id=t1.id, status="interview",
                     applied_at=datetime.utcnow() - timedelta(days=9),
                     interview_date=date.today() + timedelta(days=3))
    a2 = Application(student_id=star.id, internship_id=t2.id, status="shortlisted",
                     applied_at=datetime.utcnow() - timedelta(days=4))
    db.add_all([a1, a2])
    db.add(SavedInternship(student_id=star.id, internship_id=internships[3].id))
    db.add(SavedInternship(student_id=star.id, internship_id=internships[6].id))

    # enrollment at TechFlow (the internship the star "joined" earlier)
    start = date.today() - timedelta(days=45)
    enr = Enrollment(student_id=star.id, internship_id=t1.id, company_name="TechFlow Systems",
                     role="Software Engineering Intern", start_date=start, end_date=date.today() + timedelta(days=135),
                     mentor="Ms. Ananya Gupta", mode="remote", location="Bengaluru (Remote)",
                     intern_type="off_campus", status="active")
    db.add(enr)

    # attendance + daily reports for last 45 days (weekdays)
    task_pool = [
        ("Built REST endpoints for the user module", "Learned FastAPI dependency injection", "Slow join queries on Postgres", "Optimize with indexes"),
        ("Wired React forms to the API", "Learned controlled components + validation", "State sync bugs", "Add form validation"),
        ("Wrote unit tests for auth flow", "Learned pytest fixtures", "Mocking external calls", "Cover edge cases"),
        ("Designed dashboard heatmap component", "Learned CSS grid + color scales", "Responsive on mobile", "Polish mobile layout"),
        ("Code review + refactor of API layer", "Learned clean architecture patterns", "Circular imports", "Split modules"),
    ]
    day = start
    while day <= date.today():
        if day.weekday() < 5:  # weekdays
            r = random.choice(task_pool)
            db.add(Attendance(student_id=star.id, enrollment_id=enr.id, date=day, status="present",
                              check_in="09:30", check_out="18:00", hours=8.0,
                              summary=r[0], tasks=[r[0]], verified=True))
            db.add(DailyReport(student_id=star.id, date=day, tasks=r[0], learned=r[1], problems=r[2],
                               plan=r[3], hours=8.0, status="approved",
                               submitted_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=19)))
            if random.random() < 0.6:
                db.add(RewardLog(student_id=star.id, points=10, reason="Daily report",
                                 created_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=19)))
        else:
            db.add(Attendance(student_id=star.id, enrollment_id=enr.id, date=day, status="holiday", hours=0.0))
        day += timedelta(days=1)
    star_p.last_report_date = date.today() - timedelta(days=1)
    star_p.current_streak = 14
    star_p.longest_streak = 32
    star_p.badges = ["First Report", "7 Day Streak", "30 Day Streak", "Consistent Intern"]
    star_p.points = 1240

    # weekly reports
    for w in range(2):
        ws = start + timedelta(days=(6 - start.weekday()) + w * 7)
        db.add(WeeklyReport(student_id=star.id, week_start=ws, total_days=5, attendance_pct=100,
                            total_hours=40, tasks="Completed API module + tests", skills="FastAPI, SQLAlchemy",
                            problems="None major", progress=60 + w * 20, status="approved",
                            submitted_at=datetime.combine(ws + timedelta(days=6), datetime.min.time()) + timedelta(hours=20)))

    # other students: light activity
    ishita_p = other_profiles[0]
    for d in range(10, 0, -1):
        day = date.today() - timedelta(days=d)
        if day.weekday() < 5:
            db.add(DailyReport(student_id=ishita_p.user_id, date=day, tasks="EDA on internship dataset",
                               learned="Pandas groupby", problems="Memory limits", plan="Feature engineering",
                               hours=6, status="approved"))
    priya_p = other_profiles[4]
    for d in range(6, 0, -1):
        day = date.today() - timedelta(days=d)
        if day.weekday() < 5:
            db.add(DailyReport(student_id=priya_p.user_id, date=day, tasks="Tokenizer experiments",
                               learned="HuggingFace pipelines", problems="GPU time", plan="Fine-tune model",
                               hours=5, status="pending"))
    rahul_p = other_profiles[3]
    db.add(Enrollment(student_id=rahul_p.user_id, company_name="NextGen Robotics", role="Robotics Intern",
                      start_date=date.today() - timedelta(days=20), end_date=date.today() + timedelta(days=70),
                      mentor="Mr. Dev", mode="onsite", location="Chennai", intern_type="off_campus", status="active"))

    # ---- certificates (verification queue) -------------------------------
    db.add(Certificate(student_id=star.id, title="Internship Completion Certificate", cert_type="completion",
                       company_name="TechFlow Systems", file_url="", notes="Completed 6 month software engineering internship.",
                       score=82, status="verified",
                       indicators=["Company matches a verified company in our registry", "Document attached"]))
    db.add(Certificate(student_id=other_profiles[3].user_id, title="Summer Internship Certificate", cert_type="internship",
                       company_name="NextGen Robotics", file_url="", notes="8 week summer internship in robotics.",
                       score=55, status="review",
                       indicators=["Company found in registry but not yet verified"]))
    db.add(Certificate(student_id=other_profiles[2].user_id, title="Cert of Internship", cert_type="internship",
                       company_name="Unregistered Ventures Ltd", file_url="", notes="paid certificate from online portal",
                       score=22, status="suspicious",
                       indicators=["Company not found in our verified registry", "Title is unusually short"]))

    # ---- notifications + announcements + logs ----------------------------
    notify(db, star.id, "Interview scheduled 🎯", "Your interview for Software Engineering Intern at TechFlow Systems is on "
           + (date.today() + timedelta(days=3)).strftime("%d %b") + ".", "interview")
    notify(db, star.id, "Weekly report due", "Your weekly summary for this week is pending submission.", "deadline")
    notify(db, star.id, "Badge unlocked: Consistent Intern", "You've been consistently reporting for 30+ days.", "reward")
    notify(db, star.id, "Certificate verified 🟢", "Your TechFlow completion certificate scored 82/100.", "certificate")
    db.add(Announcement(title="Placement drive: TechFlow Systems", body="On-campus hiring for SDE roles. Register in the T&P office by Friday.", created_by=admin.id))
    db.add(Announcement(title="Internship report guidelines", body="All active interns must submit daily reports before 11 PM. Missing 3+ days resets your streak.", created_by=admin.id))
    db.add(ActivityLog(actor_id=admin.id, action="admin.verify_company", detail="TechFlow Systems -> verified"))
    db.add(ActivityLog(actor_id=star.id, action="report.submit", detail="daily report"))
    db.add(ActivityLog(actor_id=nextgen.id, action="company.verify_request", detail="NextGen Robotics"))

    db.commit()
    print("Seeded demo data:")
    print("  admin@college.edu / admin123      (T&P Cell)")
    print("  faculty@college.edu / faculty123  (Faculty)")
    print("  student@college.edu / student123  (Student - full demo)")
    print("  techflowsystems@demo.com / company123  (Verified company)")
    print("  nextgenrobotics@demo.com / company123  (Pending company)")
    print("  Others: demo123")

"""Demo data seeded on first startup (only when the users table is empty)."""
import json
import random
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from .models import (
    Announcement,
    Application,
    Attendance,
    Certificate,
    Company,
    Internship,
    Notification,
    ReportDaily,
    ReportWeekly,
    Reward,
    RewardConfig,
    SavedInternship,
    StudentProfile,
    Tracker,
    User,
)
from .security import hash_password

CITY_COORDS = {
    "Bangalore": (12.9716, 77.5946),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Chennai": (13.0827, 80.2707),
    "Gurugram": (28.4595, 77.0266),
    "Noida": (28.5355, 77.3910),
}


def _days_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


def _dt_days_ago(n: int) -> datetime:
    return datetime.utcnow() - timedelta(days=n)


def seed(db: Session):
    if db.query(User).count() > 0:
        return

    today = date.today()

    # ------------------------------------------------------------------ users
    admin = User(
        role="admin", email="admin@college.edu", password_hash=hash_password("admin123"),
        name="Dr. Priya Sharma", faculty_department="Training & Placement", faculty_designation="T&P Cell Head",
    )
    faculty = User(
        role="faculty", email="faculty@college.edu", password_hash=hash_password("faculty123"),
        name="Prof. Ramesh Iyer", faculty_department="Computer Science", faculty_designation="Associate Professor",
    )
    db.add_all([admin, faculty])
    db.flush()

    students = [
        dict(email="student@college.edu", password="student123", name="Aarav Mehta", department="Computer Science",
             branch="CSE", year="3rd Year", cgpa=8.6, phone="+91 98450 12345", location="Bangalore",
             skills="Python, React, SQL, FastAPI", points=1240, streak=12),
        dict(email="ishita@college.edu", password="demo123", name="Ishita Rao", department="Computer Science",
             branch="CSE", year="3rd Year", cgpa=9.1, phone="+91 98220 22334", location="Hyderabad",
             skills="Java, Spring, PostgreSQL", points=860, streak=5),
        dict(email="rohan@college.edu", password="demo123", name="Rohan Deshmukh", department="Electronics",
             branch="ECE", year="4th Year", cgpa=7.8, phone="+91 97654 33445", location="Pune",
             skills="Embedded C, IoT, Arduino", points=640, streak=2),
        dict(email="sneha@college.edu", password="demo123", name="Sneha Kulkarni", department="Information Technology",
             branch="IT", year="2nd Year", cgpa=8.9, phone="+91 98670 44556", location="Mumbai",
             skills="UI/UX, Figma, HTML/CSS, JavaScript", points=520, streak=8),
        dict(email="vikram@college.edu", password="demo123", name="Vikram Singh", department="Mechanical",
             branch="ME", year="3rd Year", cgpa=7.2, phone="+91 98100 55667", location="Delhi",
             skills="AutoCAD, SolidWorks, MATLAB", points=380, streak=0),
        dict(email="ananya@college.edu", password="demo123", name="Ananya Nair", department="Computer Science",
             branch="CSE", year="2nd Year", cgpa=9.4, phone="+91 99880 66778", location="Chennai",
             skills="Python, ML, Pandas, NumPy", points=710, streak=6),
    ]

    student_objs = []
    for s in students:
        u = User(
            role="student", email=s["email"], password_hash=hash_password(s["password"]), name=s["name"],
            department=s["department"], branch=s["branch"], year=s["year"], cgpa=s["cgpa"], phone=s["phone"],
            location=s["location"], points=s["points"], streak=s["streak"],
            last_active_date=today - timedelta(days=1),
            profile_completed=True,
        )
        db.add(u)
        db.flush()
        db.add(StudentProfile(
            user_id=u.id, department=s["department"], branch=s["branch"], year=s["year"], cgpa=s["cgpa"],
            phone=s["phone"], location=s["location"], skills=s["skills"],
            bio=f"Final-year {s['branch']} student passionate about building real-world software.",
            linkedin=f"https://linkedin.com/in/{s['email'].split('@')[0]}",
            github=f"https://github.com/{s['email'].split('@')[0]}",
        ))
        student_objs.append(u)

    # mentor assignment
    for st in student_objs:
        st.mentor_id = faculty.id

    # ----------------------------------------------------------------- companies
    company_data = [
        dict(email="techflowsystems@demo.com", name="TechFlow Systems", website="https://techflow.systems",
             industry="Software", location="Bangalore", verified=True,
             description="Product engineering studio building developer tools used by 40,000+ teams."),
        dict(email="nextgenrobotics@demo.com", name="NextGen Robotics", website="https://nextgenrobotics.io",
             industry="Robotics & AI", location="Pune", verified=False,
             description="Autonomous robotics startup working on warehouse automation."),
        dict(email="cloudsprint@demo.com", name="CloudSprint", website="https://cloudsprint.dev",
             industry="Cloud Infrastructure", location="Hyderabad", verified=True,
             description="Cloud-native platform startup, backed by top VCs."),
        dict(email="datanest@demo.com", name="DataNest Analytics", website="https://datanest.ai",
             industry="Data & AI", location="Mumbai", verified=True,
             description="Analytics consultancy serving fintech and e-commerce clients."),
        dict(email="finlytics@demo.com", name="Finlytics", website="https://finlytics.in",
             industry="Fintech", location="Gurugram", verified=False,
             description="AI-powered credit scoring for MSME lending."),
        dict(email="greengrid@demo.com", name="GreenGrid Energy", website="https://greengrid.energy",
             industry="CleanTech", location="Chennai", verified=True,
             description="Solar + storage optimization for industrial campuses."),
    ]
    comp_objs = []
    for cd in company_data:
        u = User(
            role="company", email=cd["email"], password_hash=hash_password("company123"),
            name=cd["name"], company_name=cd["name"], company_website=cd["website"],
            company_industry=cd["industry"], company_description=cd["description"],
            verified=cd["verified"], verification_status="verified" if cd["verified"] else "pending",
        )
        db.add(u)
        db.flush()
        c = Company(
            user_id=u.id, name=cd["name"], website=cd["website"], industry=cd["industry"],
            description=cd["description"], location=cd["location"],
            status="verified" if cd["verified"] else "pending",
        )
        db.add(c)
        db.flush()
        comp_objs.append(c)

    # ----------------------------------------------------------------- internships
    internships = [
        dict(company=0, title="Backend Engineering Intern", domain="Software Development", location="Bangalore",
             mode="hybrid", duration=6, stipend="₹25,000/month", paid=True,
             skills="Python,FastAPI,PostgreSQL,Docker", deadline=_days_ago(-12), seats=4),
        dict(company=0, title="Frontend Developer Intern (React)", domain="Software Development", location="Remote",
             mode="remote", duration=3, stipend="₹20,000/month", paid=True,
             skills="React,TypeScript,Tailwind", deadline=_days_ago(-8), seats=6),
        dict(company=1, title="Robotics Software Intern", domain="Robotics & AI", location="Pune",
             mode="onsite", duration=3, stipend="₹15,000/month", paid=True,
             skills="Python,ROS,C++,Computer Vision", deadline=_days_ago(-5), seats=2),
        dict(company=2, title="DevOps Intern", domain="Cloud Infrastructure", location="Hyderabad",
             mode="hybrid", duration=4, stipend="₹22,000/month", paid=True,
             skills="AWS,Kubernetes,Terraform,CI/CD", deadline=_days_ago(-15), seats=3),
        dict(company=2, title="Platform Engineer Intern", domain="Cloud Infrastructure", location="Remote",
             mode="wfh", duration=6, stipend="₹18,000/month", paid=True,
             skills="Go,Linux,Git,Docker", deadline=_days_ago(-10), seats=5),
        dict(company=3, title="Data Science Intern", domain="Data & AI", location="Mumbai",
             mode="hybrid", duration=4, stipend="₹20,000/month", paid=True,
             skills="Python,Pandas,ML,SQL", deadline=_days_ago(-7), seats=3),
        dict(company=3, title="BI Analyst Intern", domain="Data & AI", location="Remote",
             mode="remote", duration=3, stipend="Unpaid", paid=False,
             skills="Excel,SQL,PowerBI,Tableau", deadline=_days_ago(-20), seats=8),
        dict(company=4, title="Fintech ML Intern", domain="Fintech", location="Gurugram",
             mode="onsite", duration=4, stipend="₹25,000/month", paid=True,
             skills="Python,Scikit-learn,Finance", deadline=_days_ago(-9), seats=2),
        dict(company=5, title="Energy Data Analyst Intern", domain="CleanTech", location="Chennai",
             mode="onsite", duration=3, stipend="₹12,000/month", paid=True,
             skills="Python,Data Analysis,IoT", deadline=_days_ago(-14), seats=3),
        dict(company=5, title="UI/UX Design Intern", domain="Design", location="Remote",
             mode="remote", duration=3, stipend="₹10,000/month", paid=True,
             skills="Figma,Wireframing,Prototyping", deadline=_days_ago(-11), seats=2),
    ]
    intern_objs = []
    for idx, inv in enumerate(internships):
        comp = comp_objs[inv["company"]]
        lat, lng = CITY_COORDS.get(inv["location"], (None, None))
        i = Internship(
            company_id=comp.id, title=inv["title"], domain=inv["domain"], location=inv["location"],
            mode=inv["mode"], duration_months=inv["duration"], stipend=inv["stipend"], paid=inv["paid"],
            skills=inv["skills"], seats=inv["seats"], deadline=inv["deadline"], status="open",
            posted_at=_dt_days_ago(7 + idx), latitude=lat, longitude=lng,
            description=f"{comp.name} is hiring an intern for the {inv['title'].lower().replace(' intern', '')} role. "
                        f"Work with a fast-moving team, get real ownership, mentorship and a completion certificate.",
        )
        db.add(i)
        db.flush()
        intern_objs.append(i)

    # ----------------------------------------------------------------- activity: main student
    main = student_objs[0]
    comp0 = comp_objs[0]

    # saved internships
    for intern_idx in (2, 4, 8):
        db.add(SavedInternship(student_id=main.id, internship_id=intern_objs[intern_idx].id, saved_at=_dt_days_ago(3)))

    # applications
    app1 = Application(
        student_id=main.id, internship_id=intern_objs[0].id, status="joined",
        applied_at=_dt_days_ago(30), updated_at=_dt_days_ago(21),
        cover_letter="I have built production APIs with FastAPI and want to learn how TechFlow ships at scale.",
        stage_history=json.dumps([
            {"stage": "applied", "at": (_dt_days_ago(30)).isoformat()},
            {"stage": "shortlisted", "at": (_dt_days_ago(27)).isoformat()},
            {"stage": "interview", "at": (_dt_days_ago(24)).isoformat()},
            {"stage": "selected", "at": (_dt_days_ago(22)).isoformat()},
            {"stage": "joined", "at": (_dt_days_ago(21)).isoformat()},
        ]),
    )
    app2 = Application(
        student_id=main.id, internship_id=intern_objs[1].id, status="interview",
        applied_at=_dt_days_ago(6), updated_at=_dt_days_ago(2),
        cover_letter="React is my strongest stack — I'd love to contribute to your component library.",
        stage_history=json.dumps([
            {"stage": "applied", "at": (_dt_days_ago(6)).isoformat()},
            {"stage": "under_review", "at": (_dt_days_ago(4)).isoformat()},
            {"stage": "shortlisted", "at": (_dt_days_ago(3)).isoformat()},
            {"stage": "interview", "at": (_dt_days_ago(2)).isoformat()},
        ]),
    )
    app3 = Application(
        student_id=main.id, internship_id=intern_objs[5].id, status="rejected",
        applied_at=_dt_days_ago(10), updated_at=_dt_days_ago(8),
        cover_letter="Strong ML fundamentals and real dataset experience.",
        stage_history=json.dumps([
            {"stage": "applied", "at": (_dt_days_ago(10)).isoformat()},
            {"stage": "rejected", "at": (_dt_days_ago(8)).isoformat()},
        ]),
    )
    db.add_all([app1, app2, app3])

    # other students' applications
    other_apps = [
        (student_objs[1], intern_objs[3], "under_review", 4),
        (student_objs[1], intern_objs[0], "shortlisted", 2),
        (student_objs[2], intern_objs[2], "applied", 3),
        (student_objs[3], intern_objs[9], "interview", 2),
        (student_objs[4], intern_objs[6], "applied", 5),
        (student_objs[5], intern_objs[5], "selected", 3),
    ]
    for stu, inv, status, days in other_apps:
        db.add(Application(
            student_id=stu.id, internship_id=inv.id, status=status,
            applied_at=_dt_days_ago(days), updated_at=_dt_days_ago(max(0, days - 1)),
            cover_letter="I'm excited about this role and ready to contribute from day one.",
            stage_history=json.dumps([{"stage": status, "at": (_dt_days_ago(days)).isoformat()}]),
        ))

    # tracker for main student
    tracker = Tracker(
        student_id=main.id, internship_id=intern_objs[0].id, type="on-campus",
        company="TechFlow Systems", role="Backend Engineering Intern",
        start_date=_days_ago(21), end_date=_days_ago(-70), mentor_name="Anita Krishnan",
        mentor_email="anita@techflow.systems", mode="hybrid", location="Bangalore",
        offer_letter_path="/uploads/offer-techflow.pdf", status="active",
        created_at=_dt_days_ago(21),
    )
    db.add(tracker)
    db.flush()

    # daily reports: approved for past 12 days except weekends
    sample_content = [
        "Built the JWT auth middleware for the internship API and wrote unit tests.",
        "Designed the PostgreSQL schema for the reporting module; reviewed with mentor.",
        "Implemented the leaderboard query and optimized it with an index.",
        "Pair-programmed the file upload service with the team; fixed CORS issues.",
        "Refactored the dashboard service to cut response time from 900ms to 210ms.",
        "Wrote migration scripts and seeded test data for staging.",
        "Added rate limiting to public endpoints and documented the API.",
        "Reviewed PRs and improved test coverage to 86% for the core module.",
    ]
    d = _days_ago(14)
    while d < today:
        if d.weekday() < 5:
            r = ReportDaily(
                student_id=main.id, report_date=d,
                content=random.choice(sample_content),
                hours=random.choice([6.5, 7, 7.5, 8, 8.5]),
                status="approved", points=10, reviewed_by=faculty.id,
                feedback="Great progress, keep it up!", created_at=datetime.combine(d, datetime.min.time()),
            )
            db.add(r)
            db.add(Attendance(
                student_id=main.id, day=d, status="present",
                check_in=datetime.combine(d, datetime(2000, 1, 1, 9, 30).time()),
                check_out=datetime.combine(d, datetime(2000, 1, 1, 18, 0).time()),
                hours=8.5,
            ))
        elif d.weekday() == 5:
            db.add(Attendance(student_id=main.id, day=d, status="absent"))
        d += timedelta(days=1)
    # today: pending report + checked in
    db.add(ReportDaily(student_id=main.id, report_date=today, content="Shipped the attendance API and started the weekly summary doc.", hours=3.5, status="pending"))
    db.add(Attendance(student_id=main.id, day=today, status="present",
                      check_in=datetime.combine(today, datetime(2000, 1, 1, 9, 15).time())))

    iso = today.isocalendar()
    db.add(ReportWeekly(
        student_id=main.id, week_label=f"{iso[0]}-W{iso[1]:02d}",
        content="Completed the auth module, improved test coverage, and prepared the demo for the client call.",
        highlights="Auth middleware, API docs, 2 PRs merged", status="pending", created_at=_dt_days_ago(1),
    ))

    # rewards history
    rewards = [
        (main, 10, "Daily report approved", "report"), (main, 10, "Daily report approved", "report"),
        (main, 50, "Weekly report approved", "report"), (main, 5, "Daily check-in", "attendance"),
        (main, 10, "Daily report approved", "report"), (main, 100, "Tracker activated", "tracker"),
        (student_objs[1], 50, "Weekly report approved", "report"), (student_objs[3], 10, "Daily report approved", "report"),
    ]
    for u, pts, reason, badge in rewards:
        db.add(Reward(user_id=u.id, points=pts, reason=reason, badge=badge, created_at=_dt_days_ago(2)))

    # certificate pending for main student
    db.add(Certificate(
        student_id=main.id, tracker_id=tracker.id, code=f"INT-{main.id}-PENDING1",
        title="Summer Internship Certificate", company="TechFlow Systems", issued_by="TechFlow Systems",
        status="pending", doc_path="/uploads/cert-techflow.pdf", created_at=_dt_days_ago(2),
    ))

    # notifications
    notifs = [
        (main.id, "Interview scheduled", "Your interview with CloudSprint is on Friday at 11 AM.", "info", _dt_days_ago(1)),
        (main.id, "Report approved ✅", "Your daily report was approved. +10 points.", "success", _dt_days_ago(1)),
        (main.id, "New internship", "CloudSprint posted 'Platform Engineer Intern' matching your skills.", "system", _dt_days_ago(2)),
        (student_objs[1].id, "Application shortlisted", "Your application for Backend Engineering Intern was shortlisted.", "success", _dt_days_ago(2)),
        (student_objs[5].id, "You've been selected! 🎉", "DataNest Analytics selected you for Data Science Intern.", "success", _dt_days_ago(1)),
    ]
    for uid, title, msg, ntype, created in notifs:
        db.add(Notification(user_id=uid, title=title, message=msg, type=ntype, created_at=created))

    # reward config defaults
    for key, label, value in [
        ("daily_report", "Daily report approved", 10),
        ("weekly_report", "Weekly report approved", 50),
        ("attendance_day", "Daily check-in", 5),
        ("internship_completed", "Internship completed", 200),
        ("certificate_verified", "Certificate verified", 100),
    ]:
        db.add(RewardConfig(key=key, label=label, value=value))

    db.add(Announcement(
        title="Placement season is live!", audience="students", created_by=admin.id, created_at=_dt_days_ago(2),
        message="Companies are posting internships for the winter batch. Complete your profile to increase your chances.",
    ))
    db.add(Announcement(
        title="New verification policy", audience="companies", created_by=admin.id, created_at=_dt_days_ago(5),
        message="All company profiles must be verified by the T&P cell before posting internships.",
    ))

    db.commit()

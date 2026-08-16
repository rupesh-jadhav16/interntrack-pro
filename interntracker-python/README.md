# InternTracker — Python + PostgreSQL Edition

A full-stack internship management platform for colleges — **students**, **faculty**, **T&P cell (admin)** and **companies** — all in one system.

Built 100% for your local machine:

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Backend      | Python · FastAPI · REST · JWT auth  |
| Database     | PostgreSQL (SQLAlchemy ORM)         |
| Frontend     | Plain HTML · CSS · Vanilla JS       |
| Storage      | Local `uploads/` folder             |

No cloud APIs, no third-party services — everything runs on `localhost`.

---

## Features

**Student** — "What do I need to do today?"
- Dashboard with streak 🔥, points, attendance %, college rank, today's report status
- Internship explorer (search, filters, verified badges, save, apply)
- Application pipeline (applied → under review → shortlisted → interview → selected → joined → completed)
- Tracker activation (on-campus / off-campus / college-provided / self-found) with offer letter upload
- Daily reports (+10 pts), weekly summaries (+50 pts), attendance calendar with check-in/out
- Deadlines grouped (overdue / due today / upcoming), leaderboard, rewards & badges
- Certificate verification with an authenticity score (AI-style checks)
- Profile with resume upload and internship history

**Faculty** — "Which students need my attention?"
- At-risk flags (no streak, low attendance, report gaps)
- Review queue for daily + weekly reports (approve / reject with feedback)
- Per-student detail view (reports, attendance), weekly performance charts

**T&P Cell (Admin)** — "What's happening across the college?"
- College-wide stats, company verification queue, certificate review queue
- All students + faculty, mentor assignment, internship & application management
- Rankings, reward-points configuration, analytics charts, announcements broadcast, activity log

**Company** — "Who do I need to manage?"
- Verification status + re-submit flow
- Post / edit / close internships
- Applicant pipeline with stage controls (shortlist → interview → select → reject, students get notified)
- Current intern monitor (attendance %, reports, feedback)

Business rules are enforced server-side: no duplicate applications, faculty only see assigned students, companies only see their own applicants/interns, verified badges only via T&P approval, and every important action is logged.

---

## 1) Setup (Windows / Mac / Linux)

**Prerequisites:** Python 3.10+, PostgreSQL 14+ (or use the SQLite fallback in step 2).

```bash
# 1. Create a database (once)
psql -U postgres -c "CREATE DATABASE interntracker;"

# 2. Install dependencies
cd interntracker-python
pip install -r requirements.txt
# (Windows: python -m pip install -r requirements.txt)

# 3. Start the backend
uvicorn app.main:app --reload --port 8000
```

The server auto-creates tables and seeds demo data on first startup.

**Open http://localhost:8000** — that's it. Landing page, sign-in, and all four role dashboards are served from one process.

### Postgres connection details
The default connection string is:

```
postgresql+psycopg://postgres:postgres@localhost:5432/interntracker
```

If your local Postgres uses a different user/password, set the env var before starting:

```bash
# Windows PowerShell
$env:DATABASE_URL = "postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/interntracker"
uvicorn app.main:app --reload --port 8000

# Mac / Linux
export DATABASE_URL="postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/interntracker"
uvicorn app.main:app --reload --port 8000
```

### Zero-setup demo fallback (SQLite — no Postgres needed)
If Postgres isn't installed on your machine yet, you can demo with SQLite:

```bash
# Windows PowerShell
$env:DATABASE_URL = "sqlite:///./interntracker.db"
uvicorn app.main:app --reload --port 8000

# Mac / Linux
DATABASE_URL="sqlite:///./interntracker.db" uvicorn app.main:app --reload --port 8000
```

Everything works identically — switch back to Postgres for the actual deployment.

---

## 2) Demo accounts (seeded automatically)

| Role           | Email                        | Password      |
|----------------|------------------------------|---------------|
| Student (full) | `student@college.edu`        | `student123`  |
| Faculty        | `faculty@college.edu`        | `faculty123`  |
| T&P Cell admin | `admin@college.edu`          | `admin123`    |
| Company (verified)   | `techflowsystems@demo.com`   | `company123`  |
| Company (pending)    | `nextgenrobotics@demo.com`   | `company123`  |
| Extra students  | `ishita@college.edu` etc.    | `demo123`     |

You can also click the **demo-login buttons on the landing page** to sign in instantly.

---

## 3) Project structure

```
interntracker-python/
├── app/
│   ├── main.py            # FastAPI app, static serving, startup seed
│   ├── config.py          # DATABASE_URL, JWT secret, uploads dir
│   ├── database.py        # SQLAlchemy engine + session
│   ├── models.py          # 17 tables: users, internships, applications, reports…
│   ├── security.py        # bcrypt, JWT, role guards, notify/log helpers
│   ├── seed.py            # demo data (6 companies, 10 internships, 6 students)
│   └── routers/
│       ├── auth.py        # register / login / me
│       ├── common.py      # notifications, announcements, leaderboard, uploads
│       ├── student.py     # dashboard, explorer, tracker, reports, rewards, certs
│       ├── faculty.py     # students, report review, performance
│       ├── admin.py       # verification, certificates, analytics, rankings
│       └── company.py     # internships, applicant pipeline, intern monitor
├── static/
│   ├── index.html         # landing page + sign-in / sign-up
│   ├── student.html       # student workspace shell
│   ├── faculty.html       # faculty workspace shell
│   ├── admin.html         # T&P cell workspace shell
│   ├── company.html       # company workspace shell
│   ├── css/app.css        # Modern theme (single stylesheet)
│   └── js/                # api.js, ui.js, shell.js + one file per role
└── requirements.txt
```

## 4) API highlights

```
POST /api/auth/register          POST /api/auth/login        GET  /api/auth/me
GET  /api/internships            POST /api/internships/{id}/apply
POST /api/student/tracker/activate
GET/POST /api/student/attendance   GET/POST /api/student/reports/daily
GET/POST /api/student/reports/weekly
POST /api/student/certificates    GET /api/student/rewards   GET /api/leaderboard
GET  /api/faculty/dashboard       GET /api/faculty/reports/pending
POST /api/faculty/reports/{kind}/{id}/review
GET  /api/admin/dashboard         POST /api/admin/companies/{id}/verify
POST /api/admin/certificates/{id}/review   POST /api/admin/announcements
GET  /api/company/dashboard       POST /api/company/applications/{id}/stage
POST /api/company/interns/{id}/feedback    POST /api/upload
```

All endpoints (except register/login) require `Authorization: Bearer <JWT>`. Role guards return 403 for the wrong role; missing tokens return 401.

---

## 5) Hackathon tips

- **Demo flow:** Sign in as `student@college.edu` → full activity, active internship, streaks. Then switch to `admin@college.edu` → verification queue + analytics. Then `techflowsystems@demo.com` → applicant pipeline + intern monitor.
- **Replace demo data with real data:** the seed only runs when the `users` table is empty. Delete the seed call in `app/main.py` (or drop the DB) and register real users through the UI — the schema is production-ready.
- **Change the college name:** `app/config.py` → `COLLEGE_NAME`.
- **Change the JWT secret** before any public deployment: `app/config.py` → `SECRET_KEY` (or the `SECRET_KEY` env var).

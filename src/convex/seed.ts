import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, MutationCtx } from "./_generated/server";
import {
  addDays,
  applicationProgress,
  notify,
  startOfDay,
  weekStart,
} from "./helpers";

// ---------------------------------------------------------------------------
// ensureSystemSeeded — one-time demo dataset (companies, internships,
// demo students with activity). Idempotent.
// ---------------------------------------------------------------------------

export const ensureSystemSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("companies").first();
    if (existing) return { seeded: false };

    const now = Date.now();

    // reward config
    await ctx.db.insert("rewardConfig", {
      dailyReportPoints: 10,
      weeklyReportPoints: 50,
      perfectWeekPoints: 100,
      streak7Points: 50,
      streak30Points: 200,
      completionPoints: 500,
      verifiedInternshipPoints: 100,
      verifiedCertificatePoints: 100,
      updatedAt: now,
    });

    // ---------------- companies ----------------
    const companies: Array<Doc<"companies"> & { _id: Id<"companies"> }> = [];
    const companyDefs = [
      {
        name: "TechFlow Systems",
        email: "careers@techflow.io",
        website: "techflow.io",
        registrationInfo: "CIN U72900KA2016PTC098123",
        address: "1200 Market Street, San Francisco, CA",
        city: "San Francisco",
        industry: "Software Engineering",
        description:
          "TechFlow builds developer tooling used by 2M+ engineers. We run a structured internship program with dedicated mentors.",
        recruiterName: "Sarah Chen",
        recruiterEmail: "sarah@techflow.io",
        status: "verified" as const,
      },
      {
        name: "Quantum Metrics",
        email: "hello@quantummetrics.ai",
        website: "quantummetrics.ai",
        registrationInfo: "CIN U72900MH2019PTC321456",
        address: "Fully distributed, US",
        city: "Remote",
        industry: "Data Analytics",
        description:
          "Quantum Metrics helps product teams instrument analytics. Fully remote team across 12 time zones.",
        recruiterName: "Daniel Osei",
        recruiterEmail: "daniel@quantummetrics.ai",
        status: "verified" as const,
      },
      {
        name: "InnovateX Corp",
        email: "talent@innovatex.com",
        website: "innovatex.com",
        registrationInfo: "CIN U74999WA2018PTC654321",
        address: "500 Pine Street, Seattle, WA",
        city: "Seattle",
        industry: "Product Engineering",
        description:
          "InnovateX ships consumer SaaS products. Interns work on production frontends with real design systems.",
        recruiterName: "Maya Rodriguez",
        recruiterEmail: "maya@innovatex.com",
        status: "verified" as const,
      },
      {
        name: "Creative Cloud Inc",
        email: "interns@creativecloud.inc",
        website: "creativecloud.inc",
        registrationInfo: "CIN U72200DL2017PTC112233",
        address: "88 Congress Ave, Austin, TX",
        city: "Austin",
        industry: "Design & Research",
        description:
          "Creative Cloud runs research studios for consumer apps. Summer cohorts get full research mentorship.",
        recruiterName: "Liam Foster",
        recruiterEmail: "liam@creativecloud.inc",
        status: "verified" as const,
      },
      {
        name: "Nova Robotics",
        email: "hr@novarobotics.in",
        website: "novarobotics.in",
        registrationInfo: "CIN U31900KA2021PTC445566",
        address: "Indiranagar, Bengaluru",
        city: "Bengaluru",
        industry: "Robotics / AI",
        description:
          "Nova Robotics builds warehouse automation. Hiring interns for embedded and CV work.",
        recruiterName: "Aditya Rao",
        recruiterEmail: "aditya@novarobotics.in",
        status: "pending" as const,
      },
      {
        name: "DataNest Labs",
        email: "jobs@datanest.dev",
        website: "datanest.dev",
        registrationInfo: "CIN U72900HR2020PTC778899",
        address: "Gurugram, Haryana",
        city: "Gurugram",
        industry: "Backend / Data Engineering",
        description: "DataNest builds streaming pipelines for fintech clients.",
        recruiterName: "Rohit Khanna",
        recruiterEmail: "rohit@datanest.dev",
        status: "rejected" as const,
      },
      {
        name: "GreenGrid Energy",
        email: "interns@greengrid.energy",
        website: "greengrid.energy",
        registrationInfo: "CIN U40108PN2019PTC334455",
        address: "Baner, Pune",
        city: "Pune",
        industry: "Clean Energy",
        description:
          "GreenGrid monitors solar farms across Maharashtra. Hybrid internship with field visits.",
        recruiterName: "Anjali Deshmukh",
        recruiterEmail: "anjali@greengrid.energy",
        status: "verified" as const,
      },
      {
        name: "SkillForge Academy",
        email: "team@skillforge.io",
        website: "skillforge.io",
        registrationInfo: "CIN U80903DL2021PTC556677",
        address: "Remote-first, India",
        city: "Remote",
        industry: "EdTech",
        description:
          "SkillForge runs cohort-based learning. Curriculum interns shape courses with our content team.",
        recruiterName: "Nikhil Joshi",
        recruiterEmail: "nikhil@skillforge.io",
        status: "verified" as const,
      },
    ];

    for (const def of companyDefs) {
      const { status, ...rest } = def;
      const id = await ctx.db.insert("companies", {
        ...rest,
        verificationStatus: status,
        logo: undefined,
        submittedAt: now - 40 * 86400000,
        verifiedAt:
          status === "verified" ? now - 35 * 86400000 : undefined,
        createdAt: now - 40 * 86400000,
      });
      companies.push((await ctx.db.get(id)) as Doc<"companies"> & { _id: Id<"companies"> });
    }

    // ---------------- internships ----------------
    const internships: Array<Doc<"internships"> & { _id: Id<"internships"> }> = [];
    const internshipDefs: Array<{
      company: number;
      title: string;
      domain: string;
      mode: "remote" | "onsite" | "hybrid" | "wfh";
      type: "fulltime" | "parttime" | "summer" | "winter" | "project";
      paid: boolean;
      stipend: string;
      duration: string;
      city: string;
      skills: string[];
      deadlineInDays: number;
      description: string;
    }> = [
      {
        company: 0,
        title: "Software Engineering Intern",
        domain: "Software Engineering",
        mode: "remote",
        type: "fulltime",
        paid: true,
        stipend: "$3,000 – $4,500 / mo",
        duration: "6 months",
        city: "San Francisco",
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        deadlineInDays: 9,
        description:
          "Ship features end-to-end with a squad of senior engineers. Own a production component from design to deploy, with weekly 1:1s and a final project showcase.",
      },
      {
        company: 0,
        title: "Backend Platform Intern",
        domain: "Backend Engineering",
        mode: "hybrid",
        type: "fulltime",
        paid: true,
        stipend: "$2,500 / mo",
        duration: "4 months",
        city: "San Francisco",
        skills: ["Go", "Kubernetes", "gRPC", "AWS"],
        deadlineInDays: 16,
        description:
          "Work on the platform team scaling our CI and deployment infrastructure. Ideal for students who love distributed systems.",
      },
      {
        company: 1,
        title: "Data Analytics Intern",
        domain: "Data Analytics",
        mode: "remote",
        type: "parttime",
        paid: true,
        stipend: "$25 / hr",
        duration: "3 months",
        city: "Remote",
        skills: ["SQL", "Python", "Pandas", "Looker"],
        deadlineInDays: 12,
        description:
          "Analyze product usage at scale and build dashboards used by leadership. Part-time hours that flex around your coursework.",
      },
      {
        company: 2,
        title: "Frontend Developer Intern",
        domain: "Frontend Engineering",
        mode: "hybrid",
        type: "fulltime",
        paid: true,
        stipend: "$3,500 / mo",
        duration: "5 months",
        city: "Seattle",
        skills: ["React", "Tailwind", "Vite", "Accessibility"],
        deadlineInDays: 5,
        description:
          "Build accessible, high-quality UI for our flagship products. You will own a design-system module and ship to real users weekly.",
      },
      {
        company: 3,
        title: "UX Research Intern",
        domain: "UX Research",
        mode: "onsite",
        type: "summer",
        paid: true,
        stipend: "$4,000 / mo",
        duration: "8 weeks",
        city: "Austin",
        skills: ["User Research", "Figma", "Interviewing", "Survey Design"],
        deadlineInDays: 14,
        description:
          "Plan and run usability studies for consumer apps. You'll present findings to product teams and design improvements.",
      },
      {
        company: 4,
        title: "Robotics Engineering Intern",
        domain: "Robotics",
        mode: "onsite",
        type: "summer",
        paid: true,
        stipend: "₹25,000 / mo",
        duration: "3 months",
        city: "Bengaluru",
        skills: ["Python", "ROS", "Computer Vision", "C++"],
        deadlineInDays: 21,
        description:
          "Work with our automation team on perception pipelines for warehouse robots. Mentored by senior robotics engineers.",
      },
      {
        company: 5,
        title: "Data Engineer Intern",
        domain: "Data Engineering",
        mode: "remote",
        type: "fulltime",
        paid: true,
        stipend: "₹20,000 / mo",
        duration: "4 months",
        city: "Gurugram",
        skills: ["Python", "Airflow", "Kafka", "Spark"],
        deadlineInDays: 7,
        description:
          "Build streaming pipelines for fintech clients. Requires solid SQL and Python fundamentals.",
      },
      {
        company: 6,
        title: "Sustainability Analyst Intern",
        domain: "Clean Energy",
        mode: "hybrid",
        type: "parttime",
        paid: true,
        stipend: "₹18,000 / mo",
        duration: "3 months",
        city: "Pune",
        skills: ["Excel", "Data Analysis", "Reporting", "Energy"],
        deadlineInDays: 11,
        description:
          "Model solar farm output and prepare sustainability reports. Hybrid role with weekly field visits.",
      },
      {
        company: 7,
        title: "Curriculum Design Intern",
        domain: "EdTech",
        mode: "wfh",
        type: "project",
        paid: false,
        stipend: "Unpaid · Certificate + LOR",
        duration: "2 months",
        city: "Remote",
        skills: ["Content Writing", "Instructional Design", "Research"],
        deadlineInDays: 18,
        description:
          "Design learning modules with our content team. Great for students passionate about teaching and ed-tech.",
      },
      {
        company: 7,
        title: "Community & Outreach Intern",
        domain: "Community",
        mode: "wfh",
        type: "parttime",
        paid: false,
        stipend: "Unpaid · Certificate",
        duration: "6 months",
        city: "Remote",
        skills: ["Social Media", "Communication", "Community"],
        deadlineInDays: 25,
        description:
          "Grow our student community across campuses. Flexible hours, fully remote.",
      },
    ];

    for (const def of internshipDefs) {
      const id = await ctx.db.insert("internships", {
        companyId: companies[def.company]._id,
        title: def.title,
        description: def.description,
        domain: def.domain,
        mode: def.mode,
        type: def.type,
        paid: def.paid,
        stipend: def.stipend,
        duration: def.duration,
        city: def.city,
        location: undefined,
        skills: def.skills,
        postedAt: now - 10 * 86400000,
        deadline: addDays(now, def.deadlineInDays),
        status: "open",
      });
      internships.push((await ctx.db.get(id)) as Doc<"internships"> & { _id: Id<"internships"> });
    }

    // ---------------- demo students ----------------
    const studentDefs: Array<{
      name: string;
      department: string;
      branch: string;
      year: number;
      semester: number;
      cgpa: number;
      city: string;
      skills: string[];
      certifications: string[];
    }> = [
      {
        name: "Rahul Sharma",
        department: "Computer Science",
        branch: "CSE",
        year: 3,
        semester: 6,
        cgpa: 8.9,
        city: "Mumbai",
        skills: ["React", "TypeScript", "Node.js", "SQL"],
        certifications: ["AWS Cloud Practitioner", "Meta Frontend"],
      },
      {
        name: "Priya Patel",
        department: "Computer Science",
        branch: "CSE",
        year: 3,
        semester: 6,
        cgpa: 9.2,
        city: "Ahmedabad",
        skills: ["Python", "SQL", "Pandas", "Tableau"],
        certifications: ["Google Data Analytics", "Kaggle Expert"],
      },
      {
        name: "Amit Verma",
        department: "Electronics",
        branch: "ECE",
        year: 4,
        semester: 8,
        cgpa: 8.4,
        city: "Delhi",
        skills: ["Embedded C", "MATLAB", "PCB Design"],
        certifications: ["NPTEL Embedded Systems"],
      },
      {
        name: "Sneha Iyer",
        department: "Information Technology",
        branch: "IT",
        year: 2,
        semester: 4,
        cgpa: 8.1,
        city: "Chennai",
        skills: ["Java", "MySQL", "Git"],
        certifications: ["Java SE 8 Programmer"],
      },
      {
        name: "Arjun Mehta",
        department: "Computer Science",
        branch: "CSE",
        year: 3,
        semester: 6,
        cgpa: 7.8,
        city: "Jaipur",
        skills: ["Python", "Django", "Docker"],
        certifications: ["Docker Essentials"],
      },
      {
        name: "Neha Gupta",
        department: "Mechanical",
        branch: "ME",
        year: 4,
        semester: 8,
        cgpa: 9.0,
        city: "Nagpur",
        skills: ["SolidWorks", "ANSYS", "Thermodynamics"],
        certifications: ["Autodesk Certified Professional"],
      },
    ];

    const students: Id<"students">[] = [];
    for (const def of studentDefs) {
      const id = await ctx.db.insert("students", {
        userId: undefined,
        name: def.name,
        college: "National Institute of Technology",
        department: def.department,
        branch: def.branch,
        year: def.year,
        semester: def.semester,
        cgpa: def.cgpa,
        skills: def.skills,
        projects: [
          {
            title: `${def.name.split(" ")[0]}'s Capstone`,
            description: `A ${def.department} capstone project completed in semester ${def.semester - 1}.`,
          },
        ],
        certifications: def.certifications,
        city: def.city,
        location: undefined,
        resumeUrl: undefined,
        savedInternshipIds: [internships[0]._id, internships[2]._id],
        profileCompletion: 92,
        createdAt: now - 120 * 86400000,
      });
      students.push(id);
    }

    // ---------------- demo faculty ----------------
    const faculty1 = await ctx.db.insert("faculty", {
      userId: undefined,
      name: "Dr. Kavita Rao",
      department: "Computer Science",
      designation: "Professor & T&P Coordinator",
      createdAt: now - 200 * 86400000,
    });
    const faculty2 = await ctx.db.insert("faculty", {
      userId: undefined,
      name: "Prof. Ramesh Kumar",
      department: "Electronics",
      designation: "Associate Professor",
      createdAt: now - 180 * 86400000,
    });

    await ctx.db.insert("facultyAssignments", {
      facultyId: faculty1,
      studentId: students[0],
      createdAt: now - 100 * 86400000,
    });
    await ctx.db.insert("facultyAssignments", {
      facultyId: faculty1,
      studentId: students[1],
      createdAt: now - 100 * 86400000,
    });
    await ctx.db.insert("facultyAssignments", {
      facultyId: faculty1,
      studentId: students[4],
      createdAt: now - 100 * 86400000,
    });
    await ctx.db.insert("facultyAssignments", {
      facultyId: faculty2,
      studentId: students[2],
      createdAt: now - 100 * 86400000,
    });
    await ctx.db.insert("facultyAssignments", {
      facultyId: faculty2,
      studentId: students[5],
      createdAt: now - 100 * 86400000,
    });

    // ---------------- demo applications ----------------
    const appDefs: Array<{ s: number; i: number; status: string; daysAgo: number }> = [
      { s: 0, i: 3, status: "interview", daysAgo: 12 },
      { s: 0, i: 2, status: "shortlisted", daysAgo: 9 },
      { s: 0, i: 0, status: "joined", daysAgo: 21 },
      { s: 1, i: 2, status: "interview", daysAgo: 11 },
      { s: 1, i: 0, status: "under_review", daysAgo: 6 },
      { s: 2, i: 0, status: "selected", daysAgo: 30 },
      { s: 3, i: 4, status: "applied", daysAgo: 3 },
      { s: 3, i: 8, status: "under_review", daysAgo: 2 },
      { s: 4, i: 1, status: "under_review", daysAgo: 5 },
      { s: 4, i: 0, status: "rejected", daysAgo: 8 },
      { s: 5, i: 7, status: "interview", daysAgo: 10 },
      { s: 5, i: 6, status: "applied", daysAgo: 4 },
    ];
    for (const def of appDefs) {
      const internship = internships[def.i];
      await ctx.db.insert("applications", {
        studentId: students[def.s],
        internshipId: internship._id,
        companyId: internship.companyId,
        status: def.status as Doc<"applications">["status"],
        progress: def.status === "rejected" ? 20 : applicationProgress(def.status),
        appliedAt: now - def.daysAgo * 86400000,
      });
    }

    // ---------------- demo activity (enrollments/attendance/reports) ----------------
    await seedStudentActivity(ctx, {
      studentId: students[0],
      companyId: companies[0]._id,
      companyName: companies[0].name,
      role: "Software Engineering Intern",
      mode: "remote",
      location: "Remote",
      type: "offcampus",
      startDaysAgo: 21,
      endDaysAhead: 45,
      mentor: "Sarah Chen",
      days: 21,
      risk: false,
    });
    await seedStudentActivity(ctx, {
      studentId: students[1],
      companyId: companies[1]._id,
      companyName: companies[1].name,
      role: "Data Analytics Intern",
      mode: "remote",
      location: "Remote",
      type: "selffound",
      startDaysAgo: 18,
      endDaysAhead: 50,
      mentor: "Daniel Osei",
      days: 18,
      risk: false,
    });
    await seedStudentActivity(ctx, {
      studentId: students[4],
      companyId: companies[0]._id,
      companyName: companies[0].name,
      role: "Backend Platform Intern",
      mode: "hybrid",
      location: "Bengaluru",
      type: "oncampus",
      startDaysAgo: 25,
      endDaysAhead: 30,
      mentor: "Sarah Chen",
      days: 25,
      risk: true,
    });

    // A completed internship for Neha
    const compEnroll = await ctx.db.insert("enrollments", {
      studentId: students[5],
      internshipId: undefined,
      companyId: companies[6]._id,
      companyName: companies[6].name,
      role: "Sustainability Analyst Intern",
      startDate: now - 110 * 86400000,
      endDate: now - 20 * 86400000,
      mentor: "Anjali Deshmukh",
      mode: "hybrid",
      location: "Pune",
      type: "offcampus",
      status: "completed",
      createdAt: now - 110 * 86400000,
    });
    await seedAttendanceFor(ctx, students[5], compEnroll, 60, now - 110 * 86400000, false);

    // demo certificates
    await ctx.db.insert("certificates", {
      studentId: students[0],
      enrollmentId: undefined,
      type: "offer",
      companyName: companies[0].name,
      fileName: "TechFlow_Offer_Letter.pdf",
      url: undefined,
      uploadedAt: now - 18 * 86400000,
      verificationStatus: "verified",
      authenticityScore: 94,
      suspiciousIndicators: [],
      details:
        "Offer letter cross-checked against TechFlow records. Company verified, recruiter email domain matches.",
      adminReviewed: true,
    });
    await ctx.db.insert("certificates", {
      studentId: students[4],
      enrollmentId: undefined,
      type: "completion",
      companyName: "DataNest Labs",
      fileName: "DataNest_Completion_Certificate.pdf",
      url: undefined,
      uploadedAt: now - 6 * 86400000,
      verificationStatus: "suspicious",
      authenticityScore: 31,
      suspiciousIndicators: [
        "Company verification status is Rejected",
        "Certificate mentions a paid template vendor",
        "Signatory email domain does not match company website",
      ],
      details:
        "Submitted document appears to be generated from an online certificate template. Flagged for manual review.",
      adminReviewed: false,
    });
    await ctx.db.insert("certificates", {
      studentId: students[2],
      enrollmentId: undefined,
      type: "completion",
      companyName: "TechFlow Systems",
      fileName: "TechFlow_Completion.pdf",
      url: undefined,
      uploadedAt: now - 40 * 86400000,
      verificationStatus: "verified",
      authenticityScore: 89,
      suspiciousIndicators: [],
      details: "Completion certificate verified against company records.",
      adminReviewed: true,
    });

    // demo announcements
    await ctx.db.insert("announcements", {
      title: "Placement cell orientation — Fall semester",
      message:
        "All students are requested to complete their internship tracker profile before the placement drive begins.",
      audience: "all",
      createdBy: "T&P Cell",
      createdAt: now - 3 * 86400000,
    });

    return { seeded: true };
  },
});

// ---------------------------------------------------------------------------
// seedStudentActivity — generates an active enrollment with attendance,
// daily reports, weekly reports, certificate and feedback for a student.
// ---------------------------------------------------------------------------

async function seedStudentActivity(
  ctx: MutationCtx,
  opts: {
    studentId: Id<"students">;
    companyId: Id<"companies">;
    companyName: string;
    role: string;
    mode: "remote" | "onsite" | "hybrid" | "wfh";
    location: string;
    type: "oncampus" | "offcampus" | "collegeprovided" | "selffound";
    startDaysAgo: number;
    endDaysAhead: number;
    mentor: string;
    days: number;
    risk: boolean;
  },
) {
  const now = Date.now();
  const enrollmentId = await ctx.db.insert("enrollments", {
    studentId: opts.studentId,
    internshipId: undefined,
    companyId: opts.companyId,
    companyName: opts.companyName,
    role: opts.role,
    startDate: now - opts.startDaysAgo * 86400000,
    endDate: now + opts.endDaysAhead * 86400000,
    mentor: opts.mentor,
    mode: opts.mode,
    location: opts.location,
    type: opts.type,
    status: "active",
    createdAt: now - opts.startDaysAgo * 86400000,
  });
  await seedAttendanceFor(
    ctx,
    opts.studentId,
    enrollmentId,
    opts.days,
    now - opts.startDaysAgo * 86400000,
    opts.risk,
  );
  await seedReportsFor(
    ctx,
    opts.studentId,
    enrollmentId,
    opts.days,
    opts.risk,
  );
  await ctx.db.insert("certificates", {
    studentId: opts.studentId,
    enrollmentId,
    type: "offer",
    companyName: opts.companyName,
    fileName: `${opts.companyName.replace(/\s/g, "_")}_Offer.pdf`,
    url: undefined,
    uploadedAt: now - (opts.startDaysAgo - 2) * 86400000,
    verificationStatus: "verified",
    authenticityScore: 91,
    suspiciousIndicators: [],
    details: "Offer letter verified against company records.",
    adminReviewed: true,
  });
  await ctx.db.insert("feedback", {
    studentId: opts.studentId,
    author: opts.mentor,
    authorRole: "company",
    text: "Great progress this month. Keep pushing on the production code reviews.",
    createdAt: now - 2 * 86400000,
  });
}

async function seedAttendanceFor(
  ctx: MutationCtx,
  studentId: Id<"students">,
  enrollmentId: Id<"enrollments">,
  days: number,
  startTs: number,
  risk: boolean,
) {
  const now = Date.now();
  const today = startOfDay(now);
  for (let i = 0; i < days; i++) {
    const date = startOfDay(startTs) + i * 86400000;
    if (date > today) continue;
    const dow = new Date(date).getDay();
    let status: Doc<"attendance">["status"];
    if (dow === 0) status = "holiday";
    else if (dow === 6) status = i % 3 === 0 ? "present" : "leave";
    else {
      const r = (i * 7 + (risk ? 3 : 1)) % 11;
      if (r < 7) status = "present";
      else if (r === 7) status = "pending";
      else if (r === 8) status = risk ? "absent" : "present";
      else if (r === 9) status = "leave";
      else status = "holiday";
    }
    const hours = status === "present" ? (i % 5 === 0 ? 7.5 : 8) : status === "leave" ? 0 : undefined;
    await ctx.db.insert("attendance", {
      studentId,
      enrollmentId,
      date,
      status,
      checkIn: status === "present" ? "09:30" : undefined,
      checkOut: status === "present" ? "17:30" : undefined,
      hours,
      summary:
        status === "present"
          ? `Worked on ${["feature X", "dashboard widgets", "API integration", "code reviews", "documentation"][i % 5]}.`
          : undefined,
      tasks:
        status === "present"
          ? [
              `Task ${i + 1}: implement component`,
              `Task ${i + 2}: review PR`,
            ]
          : undefined,
      proof: undefined,
      mentorVerified: status === "present" && i % 3 !== 0,
    });
  }
}

async function seedReportsFor(
  ctx: MutationCtx,
  studentId: Id<"students">,
  enrollmentId: Id<"enrollments">,
  days: number,
  risk: boolean,
) {
  const now = Date.now();
  const today = startOfDay(now);
  const start = today - days * 86400000;
  // daily reports for the last 7 days (skip weekends partially)
  for (let i = 0; i < 7; i++) {
    const date = today - i * 86400000;
    const dow = new Date(date).getDay();
    if (dow === 0 || (i === 0 && risk)) continue; // Sunday + at-risk students miss today
    const older = date < today - 1 * 86400000;
    await ctx.db.insert("dailyReports", {
      studentId,
      enrollmentId,
      date,
      tasksCompleted: `Completed ${["unit tests", "API endpoints", "UI polish", "data model", "bug fixes"][i % 5]} and refactored the ${["auth", "dashboard", "reporting", "onboarding", "search"][i % 5]} module.`,
      learned: `Learned ${["React Query caching", "SQL window functions", "component composition", "CI pipeline setup", "performance profiling"][i % 5]}.`,
      problems: `Hit a tricky ${["race condition", "TypeScript inference issue", "CSS stacking context", "API rate limit", "memory leak"][i % 5]} — resolved with mentor's help.`,
      hours: 8,
      tomorrowPlan: "Continue sprint work and review mentor feedback.",
      attachment: undefined,
      status: older ? "approved" : "pending",
      feedback: older ? "Solid work. Keep the same momentum." : undefined,
      submittedAt: date + 15 * 3600000,
    });
  }
  // weekly reports for the past two completed weeks
  for (let w = 1; w <= 2; w++) {
    const ws = weekStart(today) - w * 7 * 86400000;
    const we = ws + 6 * 86400000;
    await ctx.db.insert("weeklyReports", {
      studentId,
      enrollmentId,
      weekStart: ws,
      weekEnd: we,
      totalWorkingDays: 5,
      attendancePercentage: 96,
      totalHours: 40,
      tasksCompleted: ["Delivered sprint milestone", "Completed code reviews", "Refactored legacy module"],
      skillsLearned: ["TypeScript", "SQL"],
      problemsFaced: ["Environment setup delays"],
      overallProgress: "On track. ~35% of internship objectives completed.",
      summary: `Completed week ${w} with 96% attendance and all deliverables met.`,
      status: "approved",
      feedback: "Excellent progress this week.",
      createdAt: we + 2 * 86400000,
    });
  }
}

// ---------------------------------------------------------------------------
// seedUserData — demo data tied to the signed-in user (per role).
// Called from the onboarding mutations after the profile is created.
// ---------------------------------------------------------------------------

export const seedUserData = mutation({
  args: { role: v.string(), studentId: v.optional(v.id("students")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const now = Date.now();

    // Load system data
    const companies = await ctx.db.query("companies").collect();
    const internships = await ctx.db.query("internships").collect();
    const students = await ctx.db.query("students").collect();
    const verifiedCompany =
      companies.find((c) => c.verificationStatus === "verified") ??
      companies[0];

    if (args.role === "student" && args.studentId) {
      const student = await ctx.db.get(args.studentId);
      if (!student) return;
      const studentId = args.studentId;

      // applications in progress
      const appDefs: Array<{ i: number; status: Doc<"applications">["status"] }> = [
        { i: 3, status: "interview" },
        { i: 2, status: "shortlisted" },
        { i: 1, status: "under_review" },
        { i: 4, status: "applied" },
      ];
      const openInternships = internships.filter((i) => i.status === "open");
      for (const def of appDefs) {
        const internship = openInternships[def.i % openInternships.length];
        if (!internship) continue;
        await ctx.db.insert("applications", {
          studentId,
          internshipId: internship._id,
          companyId: internship.companyId,
          status: def.status,
          progress: def.status === "rejected" ? 20 : applicationProgress(def.status),
          appliedAt: now - (12 - def.i) * 86400000,
        });
      }

      // saved internships
      const saved = openInternships.slice(0, 2).map((i) => i._id);
      await ctx.db.patch(args.studentId, { savedInternshipIds: saved });

      // active enrollment
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId,
        internshipId: undefined,
        companyId: verifiedCompany._id,
        companyName: verifiedCompany.name,
        role: "Software Engineering Intern",
        startDate: now - 21 * 86400000,
        endDate: now + 45 * 86400000,
        mentor: "Sarah Chen",
        mode: "remote",
        location: "Remote",
        type: "offcampus",
        status: "active",
        createdAt: now - 21 * 86400000,
      });
      await seedAttendanceFor(ctx, studentId, enrollmentId, 21, now - 21 * 86400000, false);
      await seedReportsFor(ctx, studentId, enrollmentId, 21, false);

      // certificate
      await ctx.db.insert("certificates", {
        studentId,
        enrollmentId,
        type: "offer",
        companyName: verifiedCompany.name,
        fileName: `${verifiedCompany.name.replace(/\s/g, "_")}_Offer_Letter.pdf`,
        url: undefined,
        uploadedAt: now - 19 * 86400000,
        verificationStatus: "verified",
        authenticityScore: 92,
        suspiciousIndicators: [],
        details: "Offer letter matches company records. Verified by T&P Cell.",
        adminReviewed: true,
      });

      // deadlines
      const firstApp = openInternships[3];
      if (firstApp) {
        await ctx.db.insert("deadlines", {
          userId,
          title: `Apply deadline · ${firstApp.title} at ${firstApp.city}`,
          type: "application",
          dueDate: firstApp.deadline,
          status: firstApp.deadline < now ? "overdue" : "upcoming",
          link: "/app/internships",
          createdAt: now,
        });
      }
      await ctx.db.insert("deadlines", {
        userId,
        title: `Internship completion · ${verifiedCompany.name}`,
        type: "completion",
        dueDate: now + 45 * 86400000,
        status: "upcoming",
        link: "/app/tracker",
        createdAt: now,
      });
      await ctx.db.insert("deadlines", {
        userId,
        title: "Today's daily report",
        type: "daily_report",
        dueDate: startOfDay(now) + 23 * 3600000,
        status: "upcoming",
        link: "/app/reports",
        createdAt: now,
      });

      // notifications
      await notify(
        ctx,
        userId,
        "Application moved to Interview",
        `${verifiedCompany.name} would like to schedule an interview for the Software Engineering Intern role.`,
        "success",
        "/app/applications",
      );
      await notify(
        ctx,
        userId,
        "🔥 7 day streak unlocked",
        "You submitted daily reports 7 days in a row. Keep it up!",
        "reward",
        "/app/rewards",
      );
      await notify(
        ctx,
        userId,
        "New internships near you",
        "3 new internships matched your skills in Mumbai.",
        "info",
        "/app/internships",
      );
      await notify(
        ctx,
        userId,
        "Weekly report reminder",
        "Submit your weekly report before Sunday 11:59 PM.",
        "warning",
        "/app/reports",
      );
      await notify(
        ctx,
        userId,
        "Faculty feedback",
        "Dr. Kavita Rao approved your daily report from yesterday.",
        "info",
        "/app/reports",
      );

      // consent letter (acknowledged, from an earlier internship decision)
      await ctx.db.insert("consentLetters", {
        studentId,
        title: "Internship Application Acknowledgment",
        companyName: "DataNest Labs",
        reason:
          "Application for Data Engineer Intern was closed by the company before shortlisting. This letter confirms the student has been informed and the T&P Cell has recorded the outcome.",
        status: "acknowledged",
        acknowledgedAt: now - 4 * 86400000,
        createdAt: now - 5 * 86400000,
      });

      // feedback
      await ctx.db.insert("feedback", {
        studentId,
        author: "Dr. Kavita Rao",
        authorRole: "faculty",
        text: "Strong consistency in daily reporting. Focus on deepening SQL skills this month.",
        createdAt: now - 1 * 86400000,
      });

      await ctx.db.insert("activityLogs", {
        userId,
        actor: student.name,
        role: "student",
        action: "student.onboard",
        details: "Student profile created and demo internship data seeded",
        createdAt: now,
      });
    }

    if (args.role === "faculty") {
      const faculty = await ctx.db
        .query("faculty")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      if (!faculty) return;
      // assign the first 3 demo students in the faculty's department (or any)
      const deptStudents = students.filter(
        (s) => s.department === faculty.department,
      );
      const pool = deptStudents.length >= 2 ? deptStudents : students.slice(0, 3);
      for (const s of pool.slice(0, 3)) {
        const exists = await ctx.db
          .query("facultyAssignments")
          .withIndex("by_student", (q) => q.eq("studentId", s._id))
          .first();
        if (!exists) {
          await ctx.db.insert("facultyAssignments", {
            facultyId: faculty._id,
            studentId: s._id,
            createdAt: now,
          });
        }
      }
      await notify(
        ctx,
        userId,
        "Welcome, Faculty",
        "3 students have been assigned to you. Review their pending reports from your dashboard.",
        "info",
        "/app",
      );
    }

    if (args.role === "company") {
      const company = await ctx.db
        .query("companies")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      if (!company) return;
      // create internships for this company
      const companyInternships: Id<"internships">[] = [];
      const defs = [
        {
          title: "Product Engineering Intern",
          domain: "Software Engineering",
          mode: "remote" as const,
          type: "fulltime" as const,
          paid: true,
          stipend: "$2,800 / mo",
          duration: "4 months",
          city: company.city,
          skills: ["React", "TypeScript", "REST APIs"],
          description:
            "Join our product team and ship customer-facing features with mentorship from senior engineers.",
        },
        {
          title: "Growth & Analytics Intern",
          domain: "Growth",
          mode: "hybrid" as const,
          type: "parttime" as const,
          paid: true,
          stipend: "$1,800 / mo",
          duration: "3 months",
          city: company.city,
          skills: ["SQL", "Excel", "Analytics"],
          description:
            "Measure and improve funnel performance. Great first internship for data-minded students.",
        },
        {
          title: "Quality Assurance Intern",
          domain: "QA",
          mode: "remote" as const,
          type: "project" as const,
          paid: false,
          stipend: "Unpaid · Certificate + LOR",
          duration: "2 months",
          city: company.city,
          skills: ["Testing", "Documentation", "Attention to detail"],
          description:
            "Write test plans and improve our release quality. Fully remote, flexible hours.",
        },
      ];
      for (const def of defs) {
        const id = await ctx.db.insert("internships", {
          companyId: company._id,
          title: def.title,
          description: def.description,
          domain: def.domain,
          mode: def.mode,
          type: def.type,
          paid: def.paid,
          stipend: def.stipend,
          duration: def.duration,
          city: def.city,
          location: undefined,
          skills: def.skills,
          postedAt: now - 6 * 86400000,
          deadline: now + (def.paid ? 15 : 30) * 86400000,
          status: "open",
        });
        companyInternships.push(id);
      }
      // demo applications from seeded students
      const demoStudents = students.slice(0, 4);
      const statuses: Doc<"applications">["status"][] = [
        "applied",
        "under_review",
        "shortlisted",
        "interview",
      ];
      for (let i = 0; i < Math.min(4, demoStudents.length); i++) {
        const internship = await ctx.db.get(companyInternships[i % companyInternships.length]);
        if (!internship) continue;
        await ctx.db.insert("applications", {
          studentId: demoStudents[i]._id,
          internshipId: internship._id,
          companyId: company._id,
          status: statuses[i],
          progress: applicationProgress(statuses[i]),
          appliedAt: now - (5 - i) * 86400000,
        });
      }
      await notify(
        ctx,
        userId,
        "Company profile created",
        "Your company is pending verification. Once verified by the T&P Cell, your ✓ Verified badge will appear on internships.",
        "info",
        "/app",
      );
    }

    if (args.role === "admin") {
      await notify(
        ctx,
        userId,
        "Welcome, T&P Administrator",
        "You have full visibility over the college internship ecosystem. Review pending company verifications first.",
        "info",
        "/app",
      );
    }
  },
});

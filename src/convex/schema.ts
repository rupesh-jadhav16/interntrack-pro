import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export const ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  ADMIN: "admin",
  COMPANY: "company",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.STUDENT),
  v.literal(ROLES.FACULTY),
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.COMPANY),
);
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------
export const applicationStatusValidator = v.union(
  v.literal("applied"),
  v.literal("under_review"),
  v.literal("shortlisted"),
  v.literal("interview"),
  v.literal("selected"),
  v.literal("rejected"),
  v.literal("joined"),
  v.literal("completed"),
);

export const verificationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("suspended"),
);

export const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("leave"),
  v.literal("holiday"),
  v.literal("pending"),
);

export const reportStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const internshipModeValidator = v.union(
  v.literal("remote"),
  v.literal("onsite"),
  v.literal("hybrid"),
  v.literal("wfh"),
);

export const internshipTypeValidator = v.union(
  v.literal("fulltime"),
  v.literal("parttime"),
  v.literal("summer"),
  v.literal("winter"),
  v.literal("project"),
);

export const enrollmentTypeValidator = v.union(
  v.literal("oncampus"),
  v.literal("offcampus"),
  v.literal("collegeprovided"),
  v.literal("selffound"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // -----------------------------------------------------------------------
    // Profiles
    // -----------------------------------------------------------------------
    students: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      college: v.string(),
      department: v.string(),
      branch: v.string(),
      year: v.number(),
      semester: v.number(),
      cgpa: v.number(),
      skills: v.array(v.string()),
      projects: v.array(
        v.object({ title: v.string(), description: v.string() }),
      ),
      certifications: v.array(v.string()),
      city: v.string(),
      location: v.optional(v.string()),
      resumeUrl: v.optional(v.string()),
      savedInternshipIds: v.array(v.id("internships")),
      profileCompletion: v.number(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_department", ["department"]),

    faculty: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      department: v.string(),
      designation: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_department", ["department"]),

    companies: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      email: v.string(),
      website: v.string(),
      registrationInfo: v.string(),
      address: v.string(),
      city: v.string(),
      industry: v.string(),
      description: v.string(),
      logo: v.optional(v.string()),
      recruiterName: v.string(),
      recruiterEmail: v.string(),
      verificationStatus: verificationStatusValidator,
      submittedAt: v.number(),
      verifiedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["verificationStatus"]),

    // -----------------------------------------------------------------------
    // Internships & applications
    // -----------------------------------------------------------------------
    internships: defineTable({
      companyId: v.id("companies"),
      title: v.string(),
      description: v.string(),
      domain: v.string(),
      mode: internshipModeValidator,
      type: internshipTypeValidator,
      paid: v.boolean(),
      stipend: v.string(),
      duration: v.string(),
      city: v.string(),
      location: v.optional(v.string()),
      skills: v.array(v.string()),
      postedAt: v.number(),
      deadline: v.number(),
      status: v.union(v.literal("open"), v.literal("closed")),
    })
      .index("by_company", ["companyId"])
      .index("by_status", ["status"])
      .index("by_deadline", ["deadline"]),

    applications: defineTable({
      studentId: v.id("students"),
      internshipId: v.id("internships"),
      companyId: v.id("companies"),
      status: applicationStatusValidator,
      progress: v.number(),
      appliedAt: v.number(),
      notes: v.optional(v.string()),
    })
      .index("by_student", ["studentId"])
      .index("by_company", ["companyId"])
      .index("by_internship", ["internshipId"]),

    // -----------------------------------------------------------------------
    // Internship tracking
    // -----------------------------------------------------------------------
    enrollments: defineTable({
      studentId: v.id("students"),
      internshipId: v.optional(v.id("internships")),
      companyId: v.optional(v.id("companies")),
      companyName: v.string(),
      role: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      mentor: v.string(),
      mode: internshipModeValidator,
      location: v.string(),
      type: enrollmentTypeValidator,
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("at_risk"),
      ),
      offerLetter: v.optional(v.string()),
      certificate: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_company", ["companyId"]),

    attendance: defineTable({
      studentId: v.id("students"),
      enrollmentId: v.id("enrollments"),
      date: v.number(), // start-of-day timestamp
      status: attendanceStatusValidator,
      checkIn: v.optional(v.string()),
      checkOut: v.optional(v.string()),
      hours: v.optional(v.number()),
      summary: v.optional(v.string()),
      tasks: v.optional(v.array(v.string())),
      proof: v.optional(v.string()),
      mentorVerified: v.boolean(),
    })
      .index("by_student", ["studentId"])
      .index("by_enrollment", ["enrollmentId"])
      .index("by_student_date", ["studentId", "date"]),

    dailyReports: defineTable({
      studentId: v.id("students"),
      enrollmentId: v.id("enrollments"),
      date: v.number(), // start-of-day timestamp
      tasksCompleted: v.string(),
      learned: v.string(),
      problems: v.string(),
      hours: v.number(),
      tomorrowPlan: v.string(),
      attachment: v.optional(v.string()),
      status: reportStatusValidator,
      feedback: v.optional(v.string()),
      submittedAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_enrollment", ["enrollmentId"])
      .index("by_student_date", ["studentId", "date"]),

    weeklyReports: defineTable({
      studentId: v.id("students"),
      enrollmentId: v.id("enrollments"),
      weekStart: v.number(),
      weekEnd: v.number(),
      totalWorkingDays: v.number(),
      attendancePercentage: v.number(),
      totalHours: v.number(),
      tasksCompleted: v.array(v.string()),
      skillsLearned: v.array(v.string()),
      problemsFaced: v.array(v.string()),
      overallProgress: v.string(),
      summary: v.string(),
      status: reportStatusValidator,
      feedback: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_enrollment", ["enrollmentId"]),

    // -----------------------------------------------------------------------
    // Certificates & verification
    // -----------------------------------------------------------------------
    certificates: defineTable({
      studentId: v.id("students"),
      enrollmentId: v.optional(v.id("enrollments")),
      type: v.union(
        v.literal("offer"),
        v.literal("completion"),
        v.literal("experience"),
        v.literal("other"),
      ),
      companyName: v.string(),
      fileName: v.optional(v.string()),
      url: v.optional(v.string()),
      uploadedAt: v.number(),
      verificationStatus: v.union(
        v.literal("pending"),
        v.literal("verified"),
        v.literal("requires_review"),
        v.literal("suspicious"),
      ),
      authenticityScore: v.number(),
      suspiciousIndicators: v.array(v.string()),
      details: v.string(),
      adminReviewed: v.boolean(),
    })
      .index("by_student", ["studentId"])
      .index("by_status", ["verificationStatus"]),

    // -----------------------------------------------------------------------
    // Notifications, deadlines, consent letters
    // -----------------------------------------------------------------------
    notifications: defineTable({
      userId: v.id("users"),
      title: v.string(),
      message: v.string(),
      type: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
      link: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    deadlines: defineTable({
      userId: v.id("users"),
      title: v.string(),
      type: v.string(),
      dueDate: v.number(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("due_today"),
        v.literal("overdue"),
        v.literal("completed"),
      ),
      link: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    consentLetters: defineTable({
      studentId: v.id("students"),
      title: v.string(),
      companyName: v.string(),
      reason: v.string(),
      status: v.union(v.literal("generated"), v.literal("acknowledged")),
      acknowledgedAt: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_student", ["studentId"]),

    feedback: defineTable({
      studentId: v.id("students"),
      author: v.string(),
      authorRole: v.union(
        v.literal("faculty"),
        v.literal("company"),
        v.literal("admin"),
      ),
      text: v.string(),
      createdAt: v.number(),
    }).index("by_student", ["studentId"]),

    // -----------------------------------------------------------------------
    // Faculty assignments, rewards, logs
    // -----------------------------------------------------------------------
    facultyAssignments: defineTable({
      facultyId: v.id("faculty"),
      studentId: v.id("students"),
      createdAt: v.number(),
    })
      .index("by_faculty", ["facultyId"])
      .index("by_student", ["studentId"]),

    rewardConfig: defineTable({
      dailyReportPoints: v.number(),
      weeklyReportPoints: v.number(),
      perfectWeekPoints: v.number(),
      streak7Points: v.number(),
      streak30Points: v.number(),
      completionPoints: v.number(),
      verifiedInternshipPoints: v.number(),
      verifiedCertificatePoints: v.number(),
      updatedAt: v.number(),
    }),

    activityLogs: defineTable({
      userId: v.optional(v.id("users")),
      actor: v.string(),
      role: v.string(),
      action: v.string(),
      details: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    announcements: defineTable({
      title: v.string(),
      message: v.string(),
      audience: v.string(),
      createdBy: v.string(),
      createdAt: v.number(),
    }),
  },
  {
    schemaValidation: false,
  },
);

export default schema;

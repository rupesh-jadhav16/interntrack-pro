import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, MutationCtx } from "./_generated/server";
import {
  getCurrentUser,
  isRole,
  logActivity,
  notify,
  notifyAllAdmins,
  requireRole,
  requireUser,
  startOfDay,
  weekStart,
} from "./helpers";

// ---------------------------------------------------------------------------
// Daily reports
// ---------------------------------------------------------------------------

export const submitDaily = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    date: v.optional(v.number()),
    tasksCompleted: v.string(),
    learned: v.string(),
    problems: v.string(),
    hours: v.number(),
    tomorrowPlan: v.string(),
    attachment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.studentId !== student._id)
      throw new Error("Enrollment not found");

    const date = startOfDay(args.date ?? Date.now());
    const existing = await ctx.db
      .query("dailyReports")
      .withIndex("by_student_date", (q) =>
        q.eq("studentId", student._id).eq("date", date),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        tasksCompleted: args.tasksCompleted,
        learned: args.learned,
        problems: args.problems,
        hours: args.hours,
        tomorrowPlan: args.tomorrowPlan,
        attachment: args.attachment,
        status: "pending",
        submittedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("dailyReports", {
        studentId: student._id,
        enrollmentId: args.enrollmentId,
        date,
        tasksCompleted: args.tasksCompleted,
        learned: args.learned,
        problems: args.problems,
        hours: args.hours,
        tomorrowPlan: args.tomorrowPlan,
        attachment: args.attachment,
        status: "pending",
        feedback: undefined,
        submittedAt: Date.now(),
      });
    }
    await notifyFacultyAndAdmins(ctx, student._id, {
      title: `Daily report from ${student.name}`,
      message: `${student.name} submitted their daily report (${args.hours}h) for ${new Date(date).toDateString()}.`,
      type: "info",
      link: "/app",
    });
    await logActivity(ctx, user, "report.daily", "Submitted daily internship report");
    return { ok: true };
  },
});

export const myDailyReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const result = [];
    for (const report of reports.sort((a, b) => b.date - a.date)) {
      const enrollment = await ctx.db.get(report.enrollmentId);
      result.push({ report, enrollment });
    }
    return result;
  },
});

export const reviewDaily = mutation({
  args: {
    reportId: v.id("dailyReports"),
    approve: v.boolean(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, approve, feedback }) => {
    const user = await requireUser(ctx);
    const report = await ctx.db.get(reportId);
    if (!report) throw new Error("Report not found");

    if (!isRole(user, "admin")) {
      if (isRole(user, "faculty")) {
        const assignment = await ctx.db
          .query("facultyAssignments")
          .withIndex("by_student", (q) => q.eq("studentId", report.studentId))
          .first();
        if (!assignment) throw new Error("Student is not assigned to you");
      } else {
        throw new Error("Access denied");
      }
    }

    await ctx.db.patch(report._id, {
      status: approve ? "approved" : "rejected",
      feedback: feedback ?? undefined,
    });
    const student = await ctx.db.get(report.studentId);
    if (student?.userId) {
      await notify(
        ctx,
        student.userId,
        approve ? "Daily report approved ✓" : "Daily report needs revision",
        `${user.name} ${approve ? "approved" : "requested changes to"} your report for ${new Date(report.date).toDateString()}.${feedback ? ` — ${feedback}` : ""}`,
        approve ? "success" : "warning",
        "/app/reports",
      );
    }
    await logActivity(
      ctx,
      user,
      "report.review",
      `${approve ? "Approved" : "Rejected"} daily report ${new Date(report.date).toDateString()}`,
    );
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Weekly reports
// ---------------------------------------------------------------------------

export const submitWeekly = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    weekStartTs: v.number(),
    totalWorkingDays: v.number(),
    attendancePercentage: v.number(),
    totalHours: v.number(),
    tasksCompleted: v.array(v.string()),
    skillsLearned: v.array(v.string()),
    problemsFaced: v.array(v.string()),
    overallProgress: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.studentId !== student._id)
      throw new Error("Enrollment not found");

    const ws = weekStart(args.weekStartTs);
    const we = ws + 6 * 86400000;
    const existing = await ctx.db
      .query("weeklyReports")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .filter((q) => q.eq(q.field("weekStart"), ws))
      .first();

    const payload = {
      weekStart: ws,
      weekEnd: we,
      totalWorkingDays: args.totalWorkingDays,
      attendancePercentage: args.attendancePercentage,
      totalHours: args.totalHours,
      tasksCompleted: args.tasksCompleted,
      skillsLearned: args.skillsLearned,
      problemsFaced: args.problemsFaced,
      overallProgress: args.overallProgress,
      summary: args.summary,
      status: "pending" as const,
      createdAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("weeklyReports", {
        studentId: student._id,
        enrollmentId: args.enrollmentId,
        ...payload,
        feedback: undefined,
      });
    }
    await notifyFacultyAndAdmins(ctx, student._id, {
      title: `Weekly report from ${student.name}`,
      message: `${student.name} submitted their weekly report — attendance ${args.attendancePercentage}%, ${args.totalHours} hours.`,
      type: "info",
      link: "/app",
    });
    await logActivity(ctx, user, "report.weekly", "Submitted weekly internship report");
    return { ok: true };
  },
});

/** Auto-generate a weekly report draft from attendance + daily reports. */
export const generateWeeklyDraft = query({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, { enrollmentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return null;
    const enrollment = await ctx.db.get(enrollmentId);
    if (!enrollment) return null;
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student || student._id !== enrollment.studentId) return null;

    const today = startOfDay(Date.now());
    const ws = weekStart(today);
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollmentId))
      .filter((q) => q.gte(q.field("date"), ws))
      .collect();
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollmentId))
      .filter((q) => q.gte(q.field("date"), ws))
      .collect();

    const present = attendance.filter((a) => a.status === "present").length;
    const total = Math.max(attendance.filter((a) => a.date <= today).length, 1);
    const hours = reports.reduce((sum, r) => sum + r.hours, 0);
    const tasks = reports.map((r) => r.tasksCompleted);
    return {
      weekStart: ws,
      totalWorkingDays: present,
      attendancePercentage: Math.round((present / total) * 100),
      totalHours: Math.round(hours * 10) / 10,
      tasksCompleted: tasks.length ? tasks : ["No tasks logged this week yet"],
      skillsLearned: ["TypeScript", "Communication"],
      problemsFaced: [],
      overallProgress: "Working through the sprint backlog with mentor support.",
      summary: `Week of ${new Date(ws).toDateString()} — ${present} days present, ${Math.round(hours * 10) / 10} hours logged across ${reports.length} daily reports.`,
    };
  },
});

export const myWeeklyReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const reports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const result = [];
    for (const report of reports.sort((a, b) => b.weekStart - a.weekStart)) {
      const enrollment = await ctx.db.get(report.enrollmentId);
      result.push({ report, enrollment });
    }
    return result;
  },
});

export const reviewWeekly = mutation({
  args: {
    reportId: v.id("weeklyReports"),
    approve: v.boolean(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, approve, feedback }) => {
    const user = await requireUser(ctx);
    const report = await ctx.db.get(reportId);
    if (!report) throw new Error("Report not found");

    if (isRole(user, "admin")) {
      // allowed
    } else if (isRole(user, "faculty")) {
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", report.studentId))
        .first();
      if (!assignment) throw new Error("Student is not assigned to you");
    } else if (isRole(user, "company")) {
      const enrollment = await ctx.db.get(report.enrollmentId);
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!enrollment || !company || enrollment.companyId !== company._id)
        throw new Error("This intern is not from your company");
    } else {
      throw new Error("Access denied");
    }

    await ctx.db.patch(report._id, {
      status: approve ? "approved" : "rejected",
      feedback: feedback ?? undefined,
    });
    const student = await ctx.db.get(report.studentId);
    if (student?.userId) {
      await notify(
        ctx,
        student.userId,
        approve ? "Weekly report approved ✓" : "Weekly report needs revision",
        `${user.name} ${approve ? "approved" : "requested changes to"} your weekly report.`,
        approve ? "success" : "warning",
        "/app/reports",
      );
    }
    await logActivity(ctx, user, "report.weekly.review", `${approve ? "Approved" : "Rejected"} weekly report`);
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Weekly summaries (automated weekly updates for faculty & T&P)
// ---------------------------------------------------------------------------

export const weeklySummaries = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (!isRole(user, "admin") && !isRole(user, "faculty"))) return [];

    const today = startOfDay(Date.now());
    const ws = weekStart(today);
    const we = ws + 6 * 86400000;

    let students: Array<{ _id: Id<"students"> }> = [];
    if (isRole(user, "faculty")) {
      const faculty = await ctx.db
        .query("faculty")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!faculty) return [];
      const assignments = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_faculty", (q) => q.eq("facultyId", faculty._id))
        .collect();
      students = assignments.map((a) => ({ _id: a.studentId }));
    } else {
      students = (await ctx.db.query("students").collect()).map((s) => ({
        _id: s._id,
      }));
    }

    const result = [];
    for (const { _id } of students) {
      const student = await ctx.db.get(_id);
      if (!student) continue;
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", _id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", _id))
        .filter((q) => q.gte(q.field("date"), ws))
        .collect();
      const reports = await ctx.db
        .query("dailyReports")
        .withIndex("by_student", (q) => q.eq("studentId", _id))
        .filter((q) => q.gte(q.field("date"), ws))
        .collect();
      const weekly = await ctx.db
        .query("weeklyReports")
        .withIndex("by_student", (q) => q.eq("studentId", _id))
        .filter((q) => q.eq(q.field("weekStart"), ws))
        .first();

      const present = attendance.filter((a) => a.status === "present").length;
      const workingDays = Math.max(
        attendance.filter((a) => a.date <= today).length,
        1,
      );
      const hours = reports.reduce((sum, r) => sum + r.hours, 0);
      result.push({
        student,
        enrollment,
        presentDays: present,
        workingDays,
        attendancePercentage: Math.round((present / workingDays) * 100),
        reportCount: reports.length,
        totalHours: Math.round(hours * 10) / 10,
        weeklyReportStatus: weekly?.status ?? "not_submitted",
        atRisk: attendancePercentageRisk(present, workingDays, reports.length),
      });
    }
    return result;
  },
});

function attendancePercentageRisk(
  present: number,
  workingDays: number,
  reports: number,
): boolean {
  const pct = workingDays ? present / workingDays : 1;
  return pct < 0.7 || (workingDays >= 3 && reports < workingDays - 2);
}

async function notifyFacultyAndAdmins(
  ctx: MutationCtx,
  studentId: Id<"students">,
  notif: { title: string; message: string; type: string; link?: string },
) {
  const assignment = await ctx.db
    .query("facultyAssignments")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .first();
  if (assignment) {
    const faculty = await ctx.db.get(assignment.facultyId);
    if (faculty?.userId) {
      await notify(
        ctx,
        faculty.userId,
        notif.title,
        notif.message,
        notif.type,
        notif.link,
      );
    }
  }
  await notifyAllAdmins(ctx, notif.title, notif.message, notif.type, notif.link);
}

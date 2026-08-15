import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  getCurrentUser,
  isRole,
  logActivity,
  notify,
  requireRole,
  requireUser,
  startOfDay,
  weekStart,
} from "./helpers";

export const myEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const result = [];
    for (const enrollment of enrollments.sort((a, b) => b.startDate - a.startDate)) {
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      const dailyReports = await ctx.db
        .query("dailyReports")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      const weeklyReports = await ctx.db
        .query("weeklyReports")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      result.push({
        enrollment,
        attendanceCount: attendance.length,
        presentCount: attendance.filter((a) => a.status === "present").length,
        reportCount: dailyReports.length,
        pendingReportCount: dailyReports.filter((r) => r.status === "pending").length,
        weeklyCount: weeklyReports.length,
        company: enrollment.companyId ? await ctx.db.get(enrollment.companyId) : null,
      });
    }
    return result;
  },
});

export const activate = mutation({
  args: {
    applicationId: v.optional(v.id("applications")),
    companyName: v.optional(v.string()),
    role: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    mentor: v.optional(v.string()),
    mode: v.optional(
      v.union(v.literal("remote"), v.literal("onsite"), v.literal("hybrid"), v.literal("wfh")),
    ),
    location: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("oncampus"),
        v.literal("offcampus"),
        v.literal("collegeprovided"),
        v.literal("selffound"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");

    const now = Date.now();
    let companyId: Id<"companies"> | undefined;
    let companyName = args.companyName ?? "Self-found internship";
    let role = args.role ?? "Intern";
    let internshipId: Id<"internships"> | undefined;

    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId);
      if (!application || application.studentId !== student._id)
        throw new Error("Application not found");
      if (!["selected", "joined"].includes(application.status))
        throw new Error("The internship must be selected before activation");
      const internship = await ctx.db.get(application.internshipId);
      if (internship) {
        internshipId = internship._id;
        companyId = internship.companyId;
        companyName = (await ctx.db.get(internship.companyId))?.name ?? companyName;
        role = internship.title;
      }
      await ctx.db.patch(application._id, { status: "joined", progress: 75 });
    }

    const enrollmentId = await ctx.db.insert("enrollments", {
      studentId: student._id,
      internshipId,
      companyId,
      companyName,
      role,
      startDate: args.startDate ?? startOfDay(now),
      endDate: args.endDate ?? now + 60 * 86400000,
      mentor: args.mentor ?? "To be assigned",
      mode: args.mode ?? "remote",
      location: args.location ?? "Remote",
      type: args.type ?? "offcampus",
      status: "active",
      offerLetter: undefined,
      certificate: undefined,
      createdAt: now,
    });
    await logActivity(
      ctx,
      user,
      "enrollment.activate",
      `Activated internship tracker at ${companyName}`,
    );
    await notify(
      ctx,
      user._id,
      "Internship tracker activated 🚀",
      `Your ${role} internship at ${companyName} is now being tracked. Submit your first attendance entry to start your streak.`,
      "success",
      "/app/tracker",
    );
    return { enrollmentId };
  },
});

export const completeEnrollment = mutation({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, { enrollmentId }) => {
    const user = await requireUser(ctx);
    const enrollment = await ctx.db.get(enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");
    const student = await ctx.db.get(enrollment.studentId);

    if (isRole(user, "student")) {
      const me = await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!me || me._id !== enrollment.studentId)
        throw new Error("You can only complete your own internship");
    } else if (isRole(user, "faculty")) {
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", enrollment.studentId))
        .first();
      if (!assignment) throw new Error("Student is not assigned to you");
    } else if (isRole(user, "company")) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!company || !enrollment.companyId || enrollment.companyId !== company._id)
        throw new Error("You can only complete your own internships");
    } else if (!isRole(user, "admin")) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(enrollmentId, { status: "completed" });
    await logActivity(
      ctx,
      user,
      "enrollment.complete",
      `Marked ${enrollment.companyName} internship complete for ${student?.name}`,
    );
    if (student?.userId) {
      await notify(
        ctx,
        student.userId,
        "Internship completed 🎉",
        `Your ${enrollment.role} internship at ${enrollment.companyName} has been marked complete. +500 points!`,
        "reward",
        "/app/rewards",
      );
    }
    return { ok: true };
  },
});

export const companyInterns = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "company") return [];
    const company = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!company) return [];
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    const result = [];
    for (const enrollment of enrollments) {
      const student = await ctx.db.get(enrollment.studentId);
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      const dailyReports = await ctx.db
        .query("dailyReports")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .collect();
      result.push({
        enrollment,
        student,
        attendanceCount: attendance.length,
        presentCount: attendance.filter((a) => a.status === "present").length,
        reportCount: dailyReports.length,
      });
    }
    return result;
  },
});

/**
 * Engagement data (attendance + reports) for one student within one
 * enrollment. Accessible to the student themself, faculty (assigned),
 * admin, and the company that owns the enrollment.
 */
export const internEngagement = query({
  args: { studentId: v.id("students"), enrollmentId: v.optional(v.id("enrollments")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const enrollment = args.enrollmentId
      ? await ctx.db.get(args.enrollmentId)
      : await ctx.db
          .query("enrollments")
          .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();
    if (!enrollment) return null;

    // authorization
    if (isRole(user, "student")) {
      const me = await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!me || me._id !== args.studentId) return null;
    } else if (isRole(user, "faculty")) {
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
        .first();
      if (!assignment) return null;
    } else if (isRole(user, "company")) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!company || !enrollment.companyId || enrollment.companyId !== company._id)
        return null;
    } else if (!isRole(user, "admin")) {
      return null;
    }

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    const dailyReports = await ctx.db
      .query("dailyReports")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    const weeklyReports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    const student = await ctx.db.get(args.studentId);
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    return {
      student,
      enrollment,
      attendance: attendance.sort((a, b) => b.date - a.date),
      dailyReports: dailyReports.sort((a, b) => b.date - a.date),
      weeklyReports: weeklyReports.sort((a, b) => b.weekStart - a.weekStart),
      feedback: feedback.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

/** Current week's attendance/report snapshot for "what do I need to do today". */
export const todaySnapshot = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return null;
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return null;
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!enrollment) return null;

    const today = startOfDay(Date.now());
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
    const todaysAttendance = attendance.find((a) => a.date === today);
    const todaysReport = reports.find((r) => r.date === today);
    const ws = weekStart(today);
    const thisWeek = attendance.filter(
      (a) => a.date >= ws && a.date <= today && a.status === "present",
    );
    const weekReports = reports.filter((r) => r.date >= ws && r.date <= today);

    return {
      enrollment,
      todaysAttendance: todaysAttendance ?? null,
      todaysReport: todaysReport ?? null,
      weekPresentDays: thisWeek.length,
      weekReportCount: weekReports.length,
    };
  },
});

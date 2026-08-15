import { query } from "./_generated/server";
import { getCurrentUser, isRole, startOfDay, weekStart } from "./helpers";

/** 8-week trend of attendance and daily-report submissions across assigned students. */
export const performanceTrend = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "faculty")) return [];
    const faculty = await ctx.db
      .query("faculty")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!faculty) return [];
    const assignments = await ctx.db
      .query("facultyAssignments")
      .withIndex("by_faculty", (q) => q.eq("facultyId", faculty._id))
      .collect();
    const today = startOfDay(Date.now());
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const ws = weekStart(today) - w * 7 * 86400000;
      const we = ws + 7 * 86400000;
      let present = 0;
      let totalAtt = 0;
      let reports = 0;
      for (const a of assignments) {
        const att = await ctx.db
          .query("attendance")
          .withIndex("by_student", (q) => q.eq("studentId", a.studentId))
          .filter((q) => q.and(q.gte(q.field("date"), ws), q.lt(q.field("date"), we)))
          .collect();
        totalAtt += att.length;
        present += att.filter((x) => x.status === "present").length;
        const rep = await ctx.db
          .query("dailyReports")
          .withIndex("by_student", (q) => q.eq("studentId", a.studentId))
          .filter((q) => q.and(q.gte(q.field("date"), ws), q.lt(q.field("date"), we)))
          .collect();
        reports += rep.length;
      }
      weeks.push({
        week: new Date(ws).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present,
        attendance: totalAtt ? Math.round((present / totalAtt) * 100) : 0,
        reports,
      });
    }
    return weeks;
  },
});

export const myStudents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "faculty")) return [];
    const faculty = await ctx.db
      .query("faculty")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!faculty) return [];

    const assignments = await ctx.db
      .query("facultyAssignments")
      .withIndex("by_faculty", (q) => q.eq("facultyId", faculty._id))
      .collect();
    const today = startOfDay(Date.now());

    const result = [];
    for (const assignment of assignments) {
      const student = await ctx.db.get(assignment.studentId);
      if (!student) continue;
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .collect();
      const reports = await ctx.db
        .query("dailyReports")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .collect();
      const weekly = await ctx.db
        .query("weeklyReports")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .collect();

      const present = attendance.filter((a) => a.status === "present").length;
      const attendancePct = attendance.length
        ? Math.round((present / attendance.length) * 100)
        : 0;
      const pendingReports = reports.filter(
        (r) => r.status === "pending",
      ).length;
      const pendingWeekly = weekly.filter(
        (w) => w.status === "pending",
      ).length;

      // streak
      const reportDays = new Set(reports.map((r) => startOfDay(r.date)));
      let streak = 0;
      let cursor = today;
      if (!reportDays.has(cursor)) cursor -= 86400000;
      while (reportDays.has(cursor)) {
        streak += 1;
        cursor -= 86400000;
      }

      // risk: attendance < 70% this week or missing today's report
      const ws = weekStart(today);
      const weekAttendance = attendance.filter((a) => a.date >= ws);
      const weekPresent = weekAttendance.filter((a) => a.status === "present").length;
      const atRisk =
        (weekAttendance.length > 0 && weekPresent / weekAttendance.length < 0.7) ||
        (weekAttendance.length >= 3 && !reports.some((r) => r.date === today));

      result.push({
        student,
        enrollment,
        attendancePct,
        presentCount: present,
        attendanceCount: attendance.length,
        reportCount: reports.length,
        pendingReports,
        weeklyCount: weekly.length,
        pendingWeekly,
        streak,
        atRisk,
        companyName: enrollment?.companyName ?? null,
      });
    }
    return result.sort((a, b) => Number(b.atRisk) - Number(a.atRisk));
  },
});

export const dashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "faculty")) return null;
    const faculty = await ctx.db
      .query("faculty")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!faculty) return null;
    const assignments = await ctx.db
      .query("facultyAssignments")
      .withIndex("by_faculty", (q) => q.eq("facultyId", faculty._id))
      .collect();

    const today = startOfDay(Date.now());
    let activeInternships = 0;
    let completedInternships = 0;
    let atRisk = 0;
    let pendingReports = 0;
    let pendingWeekly = 0;
    let brokenStreak = 0;
    const attendancePcts: number[] = [];

    for (const assignment of assignments) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", assignment.studentId))
        .collect();
      activeInternships += enrollments.filter((e) => e.status === "active").length;
      completedInternships += enrollments.filter((e) => e.status === "completed").length;
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_student", (q) => q.eq("studentId", assignment.studentId))
        .collect();
      const present = attendance.filter((a) => a.status === "present").length;
      if (attendance.length) {
        attendancePcts.push((present / attendance.length) * 100);
      }
      const reports = await ctx.db
        .query("dailyReports")
        .withIndex("by_student", (q) => q.eq("studentId", assignment.studentId))
        .collect();
      pendingReports += reports.filter((r) => r.status === "pending").length;
      const weekly = await ctx.db
        .query("weeklyReports")
        .withIndex("by_student", (q) => q.eq("studentId", assignment.studentId))
        .collect();
      pendingWeekly += weekly.filter((w) => w.status === "pending").length;

      const reportDays = new Set(reports.map((r) => startOfDay(r.date)));
      let cursor = today;
      if (!reportDays.has(cursor)) cursor -= 86400000;
      let streak = 0;
      while (reportDays.has(cursor)) {
        streak += 1;
        cursor -= 86400000;
      }
      if (streak === 0 && reports.length > 0) brokenStreak += 1;
      if (streak === 0 && attendance.some((a) => a.date >= today - 2 * 86400000)) {
        atRisk += 1;
      }
    }

    const avgAttendance = attendancePcts.length
      ? Math.round(
          (attendancePcts.reduce((a, b) => a + b, 0) / attendancePcts.length) * 10,
        ) / 10
      : 0;

    return {
      totalStudents: assignments.length,
      activeInternships,
      completedInternships,
      studentsAtRisk: atRisk,
      pendingReports,
      pendingWeekly,
      brokenStreaks: brokenStreak,
      avgAttendance,
      completionPct: activeInternships + completedInternships
        ? Math.round((completedInternships / (activeInternships + completedInternships)) * 100)
        : 0,
    };
  },
});

import { v } from "convex/values";
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

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return null;

    const students = await ctx.db.query("students").collect();
    const enrollments = await ctx.db.query("enrollments").collect();
    const companies = await ctx.db.query("companies").collect();
    const applications = await ctx.db.query("applications").collect();
    const internships = await ctx.db.query("internships").collect();
    const dailyReports = await ctx.db.query("dailyReports").collect();
    const attendance = await ctx.db.query("attendance").collect();

    const active = enrollments.filter((e) => e.status === "active");
    const completed = enrollments.filter((e) => e.status === "completed");
    const verified = companies.filter((c) => c.verificationStatus === "verified");
    const pending = companies.filter((c) => c.verificationStatus === "pending");

    // at risk: active enrollment + attendance < 70% or report gaps
    const today = startOfDay(Date.now());
    let atRisk = 0;
    for (const e of active) {
      const att = attendance.filter((a) => a.enrollmentId === e._id && a.date >= today - 7 * 86400000);
      const present = att.filter((a) => a.status === "present").length;
      const reports = dailyReports.filter(
        (r) => r.enrollmentId === e._id && r.date >= today - 7 * 86400000,
      );
      if ((att.length > 0 && present / att.length < 0.7) || (att.length >= 3 && reports.length < att.length - 2)) {
        atRisk += 1;
      }
    }

    const studentsWithActive = new Set(active.map((e) => e.studentId));
    const withoutInternship = students.filter((s) => !studentsWithActive.has(s._id)).length;

    // department distribution
    const deptMap = new Map<string, number>();
    for (const s of students) {
      deptMap.set(s.department, (deptMap.get(s.department) ?? 0) + 1);
    }
    const byDepartment = [...deptMap.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    // applications by status
    const statusCounts = new Map<string, number>();
    for (const a of applications) {
      statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
    }

    // attendance trend (last 8 weeks)
    const weeks: Array<{ week: string; present: number; total: number }> = [];
    for (let w = 7; w >= 0; w--) {
      const ws = weekStart(today) - w * 7 * 86400000;
      const we = ws + 7 * 86400000;
      const inWeek = attendance.filter((a) => a.date >= ws && a.date < we);
      weeks.push({
        week: new Date(ws).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present: inWeek.filter((a) => a.status === "present").length,
        total: inWeek.length,
      });
    }

    // companies by verification status
    const companyStatusCounts = new Map<string, number>();
    for (const c of companies) {
      companyStatusCounts.set(
        c.verificationStatus,
        (companyStatusCounts.get(c.verificationStatus) ?? 0) + 1,
      );
    }

    // internships by domain
    const domainCounts = new Map<string, number>();
    for (const i of internships) {
      domainCounts.set(i.domain, (domainCounts.get(i.domain) ?? 0) + 1);
    }

    return {
      totalStudents: students.length,
      activeInternships: active.length,
      completedInternships: completed.length,
      totalCompanies: companies.length,
      verifiedCompanies: verified.length,
      pendingCompanyVerification: pending.length,
      totalApplications: applications.length,
      openInternships: internships.filter((i) => i.status === "open").length,
      studentsInterning: studentsWithActive.size,
      studentsWithoutInternship: withoutInternship,
      studentsAtRisk: atRisk,
      totalDailyReports: dailyReports.length,
      byDepartment,
      applicationStatusCounts: Object.fromEntries(statusCounts),
      attendanceTrend: weeks,
      companyStatusCounts: Object.fromEntries(companyStatusCounts),
      domainCounts: Object.fromEntries(domainCounts),
    };
  },
});

export const verifyCompany = mutation({
  args: {
    companyId: v.id("companies"),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
  },
  handler: async (ctx, { companyId, status }) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);
    const company = await ctx.db.get(companyId);
    if (!company) throw new Error("Company not found");
    await ctx.db.patch(companyId, {
      verificationStatus: status,
      verifiedAt: status === "verified" ? Date.now() : company.verifiedAt,
    });
    await logActivity(
      ctx,
      user,
      "company.verify",
      `${company.name} → ${status}`,
    );
    if (company.userId) {
      await notify(
        ctx,
        company.userId,
        status === "verified" ? "Company verified ✓" : `Company verification ${status}`,
        status === "verified"
          ? `Congratulations! ${company.name} is now a verified company. The ✓ Verified badge is now active on your internships.`
          : `The T&P Cell has set your company status to "${status}". Please contact the cell for details.`,
        status === "verified" ? "success" : "warning",
        "/app",
      );
    }
    return { ok: true };
  },
});

export const allStudents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const students = await ctx.db.query("students").collect();
    const enrollments = await ctx.db.query("enrollments").collect();
    const attendance = await ctx.db.query("attendance").collect();
    const reports = await ctx.db.query("dailyReports").collect();
    const assignments = await ctx.db.query("facultyAssignments").collect();

    const result = [];
    for (const student of students) {
      const myEnrollments = enrollments.filter((e) => e.studentId === student._id);
      const active = myEnrollments.filter((e) => e.status === "active");
      const myAttendance = attendance.filter((a) => a.studentId === student._id);
      const present = myAttendance.filter((a) => a.status === "present").length;
      const myReports = reports.filter((r) => r.studentId === student._id);
      const assignment = assignments.find((a) => a.studentId === student._id);
      const faculty = assignment ? await ctx.db.get(assignment.facultyId) : null;
      result.push({
        student,
        activeEnrollment: active[0] ?? null,
        enrollmentCount: myEnrollments.length,
        attendanceCount: myAttendance.length,
        presentCount: present,
        attendancePct: myAttendance.length
          ? Math.round((present / myAttendance.length) * 100)
          : 0,
        reportCount: myReports.length,
        faculty: faculty ? { name: faculty.name, department: faculty.department } : null,
      });
    }
    return result;
  },
});

export const allFaculty = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const faculty = await ctx.db.query("faculty").collect();
    const assignments = await ctx.db.query("facultyAssignments").collect();
    return faculty.map((f) => ({
      faculty: f,
      studentCount: assignments.filter((a) => a.facultyId === f._id).length,
    }));
  },
});

export const assignFaculty = mutation({
  args: {
    studentId: v.id("students"),
    facultyId: v.optional(v.id("faculty")),
  },
  handler: async (ctx, { studentId, facultyId }) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);
    const existing = await ctx.db
      .query("facultyAssignments")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    if (facultyId) {
      await ctx.db.insert("facultyAssignments", {
        facultyId,
        studentId,
        createdAt: Date.now(),
      });
    }
    await logActivity(ctx, user, "faculty.assign", `Assigned mentor for student ${studentId}`);
    return { ok: true };
  },
});

export const activityLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const logs = await ctx.db.query("activityLogs").collect();
    return logs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 30);
  },
});

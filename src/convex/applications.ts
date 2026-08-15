import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  applicationProgress,
  getCurrentUser,
  isRole,
  logActivity,
  notify,
  requireRole,
  requireUser,
} from "./helpers";

export const apply = mutation({
  args: { internshipId: v.id("internships") },
  handler: async (ctx, { internshipId }) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");
    const internship = await ctx.db.get(internshipId);
    if (!internship || internship.status !== "open")
      throw new Error("Internship is not accepting applications");

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", internshipId))
      .filter((q) => q.eq(q.field("studentId"), student._id))
      .first();
    if (existing) throw new Error("You have already applied to this internship");

    const applicationId = await ctx.db.insert("applications", {
      studentId: student._id,
      internshipId,
      companyId: internship.companyId,
      status: "applied",
      progress: 0,
      appliedAt: Date.now(),
    });
    await logActivity(
      ctx,
      user,
      "application.apply",
      `${student.name} applied to "${internship.title}"`,
    );
    await notify(
      ctx,
      user._id,
      "Application submitted",
      `Your application for ${internship.title} has been submitted.`,
      "success",
      "/app/applications",
    );
    return { applicationId };
  },
});

export const myApplications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    const result = [];
    for (const app of applications.sort((a, b) => b.appliedAt - a.appliedAt)) {
      const internship = await ctx.db.get(app.internshipId);
      const company = internship ? await ctx.db.get(internship.companyId) : null;
      result.push({ application: app, internship, company });
    }
    return result;
  },
});

export const listForCompany = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "company") return [];
    const company = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!company) return [];
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    const result = [];
    for (const application of applications.sort(
      (a, b) => b.appliedAt - a.appliedAt,
    )) {
      const internship = await ctx.db.get(application.internshipId);
      const student = await ctx.db.get(application.studentId);
      result.push({ application, internship, student });
    }
    return result;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const applications = await ctx.db.query("applications").collect();
    const result = [];
    for (const application of applications.sort(
      (a, b) => b.appliedAt - a.appliedAt,
    )) {
      const internship = await ctx.db.get(application.internshipId);
      const student = await ctx.db.get(application.studentId);
      const company = await ctx.db.get(application.companyId);
      result.push({ application, internship, student, company });
    }
    return result;
  },
});

/** Statuses a company can set (admin can set anything). */
const COMPANY_STATUSES = [
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
];

export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("applied"),
      v.literal("under_review"),
      v.literal("shortlisted"),
      v.literal("interview"),
      v.literal("selected"),
      v.literal("rejected"),
      v.literal("joined"),
      v.literal("completed"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, status, notes }) => {
    const user = await requireUser(ctx);
    const application = await ctx.db.get(applicationId);
    if (!application) throw new Error("Application not found");

    if (isRole(user, "admin")) {
      // admins can do anything
    } else if (isRole(user, "company")) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!company || company._id !== application.companyId)
        throw new Error("You can only manage your own applications");
      if (!COMPANY_STATUSES.includes(status))
        throw new Error("Companies cannot set that status directly");
    } else if (isRole(user, "faculty")) {
      // faculty can only mark joined/completed after selection for their students
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", application.studentId))
        .first();
      if (!assignment) throw new Error("Student is not assigned to you");
      if (!["joined", "completed", "selected"].includes(status))
        throw new Error("Faculty can only confirm selection or completion");
    } else {
      throw new Error("Access denied");
    }

    await ctx.db.patch(application._id, {
      status,
      progress: applicationProgress(status),
      notes: notes ?? application.notes,
    });

    const internship = await ctx.db.get(application.internshipId);
    const student = await ctx.db.get(application.studentId);
    const company = await ctx.db.get(application.companyId);

    await logActivity(
      ctx,
      user,
      "application.status",
      `${student?.name ?? "Student"} application for ${internship?.title ?? ""} → ${status}`,
    );

    // notify the student
    if (student?.userId) {
      const titleByStatus: Record<string, string> = {
        under_review: "Application under review",
        shortlisted: "You've been shortlisted! 🎉",
        interview: "Interview scheduled",
        selected: "Congratulations — you've been selected!",
        rejected: "Application update",
        joined: "Internship confirmed",
        completed: "Internship marked completed",
      };
      const messageByStatus: Record<string, string> = {
        under_review: `${company?.name ?? "The company"} is reviewing your application for ${internship?.title}.`,
        shortlisted: `${company?.name ?? "The company"} has shortlisted you for ${internship?.title}.`,
        interview: `${company?.name ?? "The company"} wants to schedule an interview for ${internship?.title}.`,
        selected: `${company?.name ?? "The company"} has selected you for ${internship?.title}. Accept your offer to start tracking.`,
        rejected: `Your application for ${internship?.title} at ${company?.name} was not successful.`,
        joined: `Your internship at ${company?.name} is confirmed. Activate your tracker to start logging daily work.`,
        completed: `Your internship at ${company?.name} has been marked completed. Congratulations!`,
      };
      if (titleByStatus[status]) {
        await notify(
          ctx,
          student.userId,
          titleByStatus[status],
          messageByStatus[status] ?? "",
          status === "rejected" ? "error" : "success",
          "/app/applications",
        );
      }
      if (status === "rejected") {
        // generate consent letter
        await ctx.db.insert("consentLetters", {
          studentId: application.studentId,
          title: "Internship Application Outcome — Acknowledgement",
          companyName: company?.name ?? "Unknown",
          reason: `The application for ${internship?.title} at ${company?.name} was not successful. This acknowledgement records that the student has been informed and the outcome has been logged with the T&P Cell.`,
          status: "generated",
          acknowledgedAt: undefined,
          createdAt: Date.now(),
        });
        await notify(
          ctx,
          student.userId,
          "Acknowledgement letter generated",
          "An acknowledgement letter has been generated for this application outcome. Review and acknowledge it from your profile.",
          "info",
          "/app/profile",
        );
      }
    }    return await ctx.db.get(applicationId);
  },
});

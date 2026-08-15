import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  isRole,
  logActivity,
  notify,
  requireUser,
} from "./helpers";

/** Add feedback for a student. Faculty: only assigned students.
 *  Company: only their interns. Admin: anyone. */
export const add = mutation({
  args: { studentId: v.id("students"), text: v.string() },
  handler: async (ctx, { studentId, text }) => {
    const user = await requireUser(ctx);
    const student = await ctx.db.get(studentId);
    if (!student) throw new Error("Student not found");

    let author = user.name ?? user.email ?? "Mentor";
    let authorRole: "faculty" | "company" | "admin";

    if (isRole(user, "admin")) {
      authorRole = "admin";
      author = `${author} (T&P)`;
    } else if (isRole(user, "faculty")) {
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .first();
      if (!assignment) throw new Error("Student is not assigned to you");
      authorRole = "faculty";
    } else if (isRole(user, "company")) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!company) throw new Error("Company profile not found");
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .filter((q) => q.eq(q.field("companyId"), company._id))
        .first();
      if (!enrollment) throw new Error("This student is not your intern");
      author = company.name;
      authorRole = "company";
    } else {
      throw new Error("Access denied");
    }

    await ctx.db.insert("feedback", {
      studentId,
      author,
      authorRole,
      text,
      createdAt: Date.now(),
    });
    if (student.userId) {
      await notify(
        ctx,
        student.userId,
        `New feedback from ${author}`,
        text,
        "info",
        "/app/profile",
      );
    }
    await logActivity(ctx, user, "feedback.add", `Feedback for ${student.name}`);
    return { ok: true };
  },
});

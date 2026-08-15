import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getCurrentUser,
  logActivity,
  requireRole,
  requireUser,
  startOfDay,
} from "./helpers";

export const submit = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    date: v.optional(v.number()),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("leave"),
      v.literal("holiday"),
      v.literal("pending"),
    ),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    summary: v.optional(v.string()),
    tasks: v.optional(v.array(v.string())),
    proof: v.optional(v.string()),
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

    // compute hours
    let hours: number | undefined;
    if (args.checkIn && args.checkOut) {
      const [hi, mi] = args.checkIn.split(":").map(Number);
      const [ho, mo] = args.checkOut.split(":").map(Number);
      const start = hi * 60 + mi;
      const end = ho * 60 + mo;
      hours = end > start ? Math.round(((end - start) / 60) * 10) / 10 : 0;
    }

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_date", (q) =>
        q.eq("studentId", student._id).eq("date", date),
      )
      .first();

    const payload = {
      status: args.status,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      hours: hours ?? (args.status === "present" ? 8 : 0),
      summary: args.summary,
      tasks: args.tasks,
      proof: args.proof,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("attendance", {
        studentId: student._id,
        enrollmentId: args.enrollmentId,
        date,
        ...payload,
        mentorVerified: false,
      });
    }
    await logActivity(
      ctx,
      user,
      "attendance.submit",
      `Submitted attendance for ${new Date(date).toDateString()} (${args.status})`,
    );
    return { ok: true, date };
  },
});

export const myAttendance = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!enrollment) return [];
    return await ctx.db
      .query("attendance")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect();
  },
});

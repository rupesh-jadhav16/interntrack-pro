import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, isRole, logActivity, requireUser } from "./helpers";

export const myConsentLetters = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return [];
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return [];
    const letters = await ctx.db
      .query("consentLetters")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    return letters.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const allConsentLetters = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const letters = await ctx.db.query("consentLetters").collect();
    const result = [];
    for (const letter of letters.sort((a, b) => b.createdAt - a.createdAt)) {
      const student = await ctx.db.get(letter.studentId);
      result.push({ letter, student });
    }
    return result;
  },
});

export const acknowledge = mutation({
  args: { letterId: v.id("consentLetters") },
  handler: async (ctx, { letterId }) => {
    const user = await requireUser(ctx);
    const letter = await ctx.db.get(letterId);
    if (!letter) throw new Error("Letter not found");
    if (user.role === "student") {
      const student = await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!student || student._id !== letter.studentId)
        throw new Error("You can only acknowledge your own letters");
    } else if (!isRole(user, "admin")) {
      throw new Error("Access denied");
    }
    await ctx.db.patch(letterId, {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
    });
    await logActivity(ctx, user, "consent.acknowledge", `Acknowledged letter ${letterId}`);
    return { ok: true };
  },
});

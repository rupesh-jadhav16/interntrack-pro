import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import {
  getCurrentUser,
  isRole,
  logActivity,
  notify,
  requireRole,
  requireUser,
} from "./helpers";

// ---------------------------------------------------------------------------
// Current user profile (by role)
// ---------------------------------------------------------------------------

export const myStudentProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return null;
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return student ?? null;
  },
});

export const myFacultyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "faculty") return null;
    return await ctx.db
      .query("faculty")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const myCompanyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "company") return null;
    return await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const getStudentById = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, { studentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    // faculty can view assigned students, admin all, company only interns
    if (isRole(user, "faculty")) {
      const assignment = await ctx.db
        .query("facultyAssignments")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .first();
      if (!assignment) return null;
    } else if (isRole(user, "company")) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!company) return null;
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .filter((q) => q.eq(q.field("companyId"), company._id))
        .first();
      if (!enrollment) return null;
    } else if (!isRole(user, "admin")) {
      const student = await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (!student || student._id !== studentId) return null;
    }
    return await ctx.db.get(studentId);
  },
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const onboardStudent = mutation({
  args: {
    name: v.string(),
    college: v.string(),
    department: v.string(),
    branch: v.string(),
    year: v.number(),
    semester: v.number(),
    cgpa: v.number(),
    skills: v.array(v.string()),
    city: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.seed.ensureSystemSeeded, {});
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const existing = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      await ctx.runMutation(api.seed.seedUserData, {
        role: "student",
        studentId: existing._id,
      });
      return { studentId: existing._id };
    }
    const studentId = await ctx.db.insert("students", {
      userId: user._id,
      name: args.name,
      college: args.college,
      department: args.department,
      branch: args.branch,
      year: args.year,
      semester: args.semester,
      cgpa: args.cgpa,
      skills: args.skills,
      projects: [],
      certifications: [],
      city: args.city,
      location: undefined,
      resumeUrl: undefined,
      savedInternshipIds: [],
      profileCompletion: 60,
      createdAt: Date.now(),
    });
    await ctx.db.patch(user._id, { name: args.name });
    await logActivity(ctx, user, "student.onboard", "Created student profile");
    await ctx.runMutation(api.seed.seedUserData, {
      role: "student",
      studentId,
    });
    return { studentId };
  },
});

export const updateStudentProfile = mutation({
  args: {
    name: v.optional(v.string()),
    college: v.optional(v.string()),
    department: v.optional(v.string()),
    branch: v.optional(v.string()),
    year: v.optional(v.number()),
    semester: v.optional(v.number()),
    cgpa: v.optional(v.number()),
    skills: v.optional(v.array(v.string())),
    city: v.optional(v.string()),
    resumeUrl: v.optional(v.string()),
    projects: v.optional(
      v.array(v.object({ title: v.string(), description: v.string() })),
    ),
    certifications: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");
    const patch: Record<string, unknown> = {};
    const fields = [
      args.name ?? student.name,
      args.college ?? student.college,
      args.department ?? student.department,
      args.branch ?? student.branch,
      args.year ?? student.year,
      args.cgpa ?? student.cgpa,
      (args.skills ?? student.skills).length > 0,
      args.city ?? student.city,
    ].filter(Boolean).length;
    const completion = Math.min(100, Math.round((fields / 9) * 100));
    if (args.name !== undefined) patch.name = args.name;
    if (args.college !== undefined) patch.college = args.college;
    if (args.department !== undefined) patch.department = args.department;
    if (args.branch !== undefined) patch.branch = args.branch;
    if (args.year !== undefined) patch.year = args.year;
    if (args.semester !== undefined) patch.semester = args.semester;
    if (args.cgpa !== undefined) patch.cgpa = args.cgpa;
    if (args.skills !== undefined) patch.skills = args.skills;
    if (args.city !== undefined) patch.city = args.city;
    if (args.resumeUrl !== undefined) patch.resumeUrl = args.resumeUrl;
    if (args.projects !== undefined) patch.projects = args.projects;
    if (args.certifications !== undefined) patch.certifications = args.certifications;
    patch.profileCompletion = completion;
    await ctx.db.patch(student._id, patch);
    if (args.name) await ctx.db.patch(user._id, { name: args.name });
    return await ctx.db.get(student._id);
  },
});

export const onboardFaculty = mutation({
  args: {
    name: v.string(),
    department: v.string(),
    designation: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.seed.ensureSystemSeeded, {});
    const user = await requireUser(ctx);
    requireRole(user, ["faculty"]);
    const existing = await ctx.db
      .query("faculty")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!existing) {
      await ctx.db.insert("faculty", {
        userId: user._id,
        name: args.name,
        department: args.department,
        designation: args.designation,
        createdAt: Date.now(),
      });
      await ctx.db.patch(user._id, { name: args.name });
      await logActivity(ctx, user, "faculty.onboard", "Created faculty profile");
    }
    await ctx.runMutation(api.seed.seedUserData, { role: "faculty" });
    return { ok: true };
  },
});

export const onboardCompany = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    website: v.string(),
    registrationInfo: v.string(),
    address: v.string(),
    city: v.string(),
    industry: v.string(),
    description: v.string(),
    recruiterName: v.string(),
    recruiterEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.seed.ensureSystemSeeded, {});
    const user = await requireUser(ctx);
    requireRole(user, ["company"]);
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!existing) {
      await ctx.db.insert("companies", {
        userId: user._id,
        ...args,
        logo: undefined,
        verificationStatus: "pending",
        submittedAt: Date.now(),
        verifiedAt: undefined,
        createdAt: Date.now(),
      });
      await logActivity(ctx, user, "company.onboard", "Created company profile");
    }
    await ctx.runMutation(api.seed.seedUserData, { role: "company" });
    return { ok: true };
  },
});

export const updateCompanyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    recruiterName: v.optional(v.string()),
    recruiterEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["company"]);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!company) throw new Error("Company profile not found");
    await ctx.db.patch(company._id, args);
    return await ctx.db.get(company._id);
  },
});

// ---------------------------------------------------------------------------
// Role assignment (called from onboarding page)
// ---------------------------------------------------------------------------

export const setRole = mutation({
  args: { role: v.union(v.literal("student"), v.literal("faculty"), v.literal("admin"), v.literal("company")) },
  handler: async (ctx, { role }) => {
    await ctx.runMutation(api.seed.ensureSystemSeeded, {});
    const user = await requireUser(ctx);
    if (user.role && user.role !== role) {
      throw new Error(
        "You already have a role on this account. Sign out and use a different account.",
      );
    }
    await ctx.db.patch(user._id, { role });
    if (role === "admin") {
      await ctx.runMutation(api.seed.seedUserData, { role: "admin" });
      await logActivity(ctx, user, "admin.onboard", "Admin access granted");
      await notify(
        ctx,
        user._id,
        "T&P Cell access granted",
        "You now have administrative access to the internship ecosystem.",
        "success",
        "/app",
      );
    }
    return { ok: true };
  },
});

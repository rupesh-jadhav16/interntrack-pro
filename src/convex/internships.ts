import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import {
  getCurrentUser,
  isRole,
  logActivity,
  requireRole,
  requireUser,
} from "./helpers";

export const list = query({
  args: {
    search: v.optional(v.string()),
    mode: v.optional(v.string()),
    domain: v.optional(v.string()),
    type: v.optional(v.string()),
    paid: v.optional(v.boolean()),
    verifiedOnly: v.optional(v.boolean()),
    city: v.optional(v.string()),
    sort: v.optional(v.string()), // "recent" | "deadline" | "stipend"
  },
  handler: async (ctx, args) => {
    const internships = await ctx.db
      .query("internships")
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    const companies = new Map(
      (await ctx.db.query("companies").collect()).map((c) => [c._id, c]),
    );
    const student = await (async () => {
      const user = await getCurrentUser(ctx);
      if (!user || user.role !== "student") return null;
      return await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
    })();
    const myApplications = student
      ? await ctx.db
          .query("applications")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect()
      : [];

    const appliedIds = new Set(myApplications.map((a) => a.internshipId));

    let result = internships.map((internship) => {
      const company = companies.get(internship.companyId);
      return {
        internship,
        company,
        applied: appliedIds.has(internship._id),
        saved: !!student?.savedInternshipIds.includes(internship._id),
      };
    });

    if (args.search) {
      const q = args.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.internship.title.toLowerCase().includes(q) ||
          r.internship.description.toLowerCase().includes(q) ||
          r.internship.skills.some((s) => s.toLowerCase().includes(q)) ||
          (r.company?.name.toLowerCase().includes(q) ?? false),
      );
    }
    if (args.mode) result = result.filter((r) => r.internship.mode === args.mode);
    if (args.domain) result = result.filter((r) => r.internship.domain === args.domain);
    if (args.type) result = result.filter((r) => r.internship.type === args.type);
    if (args.paid !== undefined)
      result = result.filter((r) => r.internship.paid === args.paid);
    if (args.city)
      result = result.filter((r) =>
        r.internship.city.toLowerCase().includes(args.city!.toLowerCase()),
      );
    if (args.verifiedOnly)
      result = result.filter((r) => r.company?.verificationStatus === "verified");

    if (args.sort === "deadline") {
      result.sort((a, b) => a.internship.deadline - b.internship.deadline);
    } else if (args.sort === "recent") {
      result.sort((a, b) => b.internship.postedAt - a.internship.postedAt);
    } else {
      // default: stipend first? keep posted recency
      result.sort((a, b) => b.internship.postedAt - a.internship.postedAt);
    }

    return result.map((r) => ({
      ...r,
      company: r.company ?? null,
    }));
  },
});

export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !isRole(user, "admin")) return [];
    const internships = await ctx.db.query("internships").collect();
    const result = [];
    for (const internship of internships.sort((a, b) => b.postedAt - a.postedAt)) {
      const company = await ctx.db.get(internship.companyId);
      result.push({ internship, company });
    }
    return result;
  },
});

export const get = query({
  args: { internshipId: v.id("internships") },
  handler: async (ctx, { internshipId }) => {
    const internship = await ctx.db.get(internshipId);
    if (!internship) return null;
    const company = await ctx.db.get(internship.companyId);
    return { internship, company };
  },
});

export const toggleSave = mutation({
  args: { internshipId: v.id("internships") },
  handler: async (ctx, { internshipId }) => {
    const user = await requireUser(ctx);
    requireRole(user, ["student"]);
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) throw new Error("Student profile not found");
    const saved = student.savedInternshipIds.includes(internshipId);
    const next = saved
      ? student.savedInternshipIds.filter((id) => id !== internshipId)
      : [...student.savedInternshipIds, internshipId];
    await ctx.db.patch(student._id, { savedInternshipIds: next });
    return { saved: !saved };
  },
});

// ---------------------------------------------------------------------------
// Company-side CRUD
// ---------------------------------------------------------------------------

async function myCompany(ctx: MutationCtx) {
  const user = await requireUser(ctx);
  requireRole(user, ["company"]);
  const company = await ctx.db
    .query("companies")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!company) throw new Error("Company profile not found");
  return { user, company };
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    domain: v.string(),
    mode: v.union(v.literal("remote"), v.literal("onsite"), v.literal("hybrid"), v.literal("wfh")),
    type: v.union(v.literal("fulltime"), v.literal("parttime"), v.literal("summer"), v.literal("winter"), v.literal("project")),
    paid: v.boolean(),
    stipend: v.string(),
    duration: v.string(),
    city: v.string(),
    skills: v.array(v.string()),
    deadlineDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, company } = await myCompany(ctx);
    const id = await ctx.db.insert("internships", {
      companyId: company._id,
      title: args.title,
      description: args.description,
      domain: args.domain,
      mode: args.mode,
      type: args.type,
      paid: args.paid,
      stipend: args.stipend,
      duration: args.duration,
      city: args.city,
      location: undefined,
      skills: args.skills,
      postedAt: Date.now(),
      deadline: Date.now() + args.deadlineDays * 86400000,
      status: "open",
    });
    await logActivity(ctx, user, "internship.create", `Created internship "${args.title}"`);
    return { internshipId: id };
  },
});

export const update = mutation({
  args: {
    internshipId: v.id("internships"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    stipend: v.optional(v.string()),
    deadlineDays: v.optional(v.number()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { user, company } = await myCompany(ctx);
    const internship = await ctx.db.get(args.internshipId);
    if (!internship || internship.companyId !== company._id) {
      throw new Error("Internship not found");
    }
    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.stipend !== undefined) patch.stipend = args.stipend;
    if (args.skills !== undefined) patch.skills = args.skills;
    if (args.deadlineDays !== undefined)
      patch.deadline = Date.now() + args.deadlineDays * 86400000;
    await ctx.db.patch(internship._id, patch);
    await logActivity(ctx, user, "internship.update", `Updated internship "${internship.title}"`);
    return await ctx.db.get(internship._id);
  },
});

export const close = mutation({
  args: { internshipId: v.id("internships") },
  handler: async (ctx, { internshipId }) => {
    const { user, company } = await myCompany(ctx);
    const internship = await ctx.db.get(internshipId);
    if (!internship || internship.companyId !== company._id) {
      throw new Error("Internship not found");
    }
    await ctx.db.patch(internship._id, { status: "closed" });
    await logActivity(ctx, user, "internship.close", `Closed internship "${internship.title}"`);
    return { ok: true };
  },
});

export const myCompanyInternships = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "company") return [];
    const company = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!company) return [];
    const internships = await ctx.db
      .query("internships")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    return internships.map((internship) => ({
      internship,
      applicationCount: apps.filter((a) => a.internshipId === internship._id).length,
    }));
  },
});

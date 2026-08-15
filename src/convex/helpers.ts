import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ROLES, type Role } from "./schema";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  return user;
}

export function requireRole(user: Doc<"users">, roles: Role[]) {
  if (!user.role || !roles.includes(user.role as Role)) {
    throw new ConvexError(
      `Access denied: this action requires the ${roles.join(" or ")} role`,
    );
  }
  return user.role as Role;
}

export const isRole = (user: Doc<"users"> | null | undefined, role: Role) =>
  !!user && user.role === role;

// ---------------------------------------------------------------------------
// Date helpers (local-time day boundaries, ms timestamps)
// ---------------------------------------------------------------------------

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(ts: number, days: number): number {
  return ts + days * 86400000;
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

/** Monday of the week containing ts (local). */
export function weekStart(ts: number): number {
  const d = new Date(startOfDay(ts));
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  return startOfDay(d.getTime()) - day * 86400000;
}

// ---------------------------------------------------------------------------
// Notifications & logging
// ---------------------------------------------------------------------------

export async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  title: string,
  message: string,
  type = "info",
  link?: string,
) {
  await ctx.db.insert("notifications", {
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: Date.now(),
    link,
  });
}

export async function logActivity(
  ctx: MutationCtx,
  user: Doc<"users">,
  action: string,
  details: string,
) {
  await ctx.db.insert("activityLogs", {
    userId: user._id,
    actor: user.name ?? user.email ?? "Unknown",
    role: user.role ?? "none",
    action,
    details,
    createdAt: Date.now(),
  });
}

/** Notify all admin users (T&P cell). */
export async function notifyAllAdmins(
  ctx: MutationCtx,
  title: string,
  message: string,
  type = "info",
  link?: string,
) {
  const admins = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("role"), ROLES.ADMIN))
    .collect();
  for (const admin of admins) {
    await notify(ctx, admin._id, title, message, type, link);
  }
}

// ---------------------------------------------------------------------------
// Shared formatting (mirrored on the frontend in src/lib/constants.ts)
// ---------------------------------------------------------------------------

export const APPLICATION_STEPS = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "joined",
  "completed",
] as const;

export function applicationProgress(status: string): number {
  const idx = APPLICATION_STEPS.indexOf(status as (typeof APPLICATION_STEPS)[number]);
  if (status === "rejected") return 20;
  return idx >= 0 ? Math.round((idx / (APPLICATION_STEPS.length - 1)) * 100) : 0;
}

export const MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
  wfh: "Work From Home",
};

export const TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  summer: "Summer",
  winter: "Winter",
  project: "Project",
};

export const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
  oncampus: "On-campus internship",
  offcampus: "Off-campus internship",
  collegeprovided: "College-provided internship",
  selffound: "Self-found internship",
};

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, QueryCtx } from "./_generated/server";
import {
  getCurrentUser,
  requireRole,
  requireUser,
  startOfDay,
  weekStart,
} from "./helpers";

const DEFAULT_CONFIG = {
  dailyReportPoints: 10,
  weeklyReportPoints: 50,
  perfectWeekPoints: 100,
  streak7Points: 50,
  streak30Points: 200,
  completionPoints: 500,
  verifiedInternshipPoints: 100,
  verifiedCertificatePoints: 100,
};

async function getConfig(ctx: QueryCtx) {
  const config = await ctx.db.query("rewardConfig").first();
  return config ?? DEFAULT_CONFIG;
}

// ---------------------------------------------------------------------------
// Streak computation
// ---------------------------------------------------------------------------

export function computeStreaks(reportDates: number[], today: number) {
  const days = new Set(reportDates.map((d) => startOfDay(d)));
  let current = 0;
  let cursor = startOfDay(today);
  // if today's report is missing, start from yesterday (streak stays alive)
  if (!days.has(cursor)) cursor -= 86400000;
  while (days.has(cursor)) {
    current += 1;
    cursor -= 86400000;
  }
  let longest = 0;
  let run = 0;
  let prev = -1;
  const sorted = [...days].sort((a, b) => a - b);
  for (const d of sorted) {
    if (prev >= 0 && d - prev === 86400000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, totalDays: days.size };
}

export function computeBadges(points: number, stats: {
  reports: number;
  longestStreak: number;
  perfectWeeks: number;
  completed: number;
  verifiedCertificates: number;
  verifiedInternship: boolean;
  rank: number;
}) {
  const badges: Array<{ name: string; emoji: string; description: string; earned: boolean }> = [
    { name: "First Report", emoji: "🌱", description: "Submit your first daily report", earned: stats.reports >= 1 },
    { name: "Consistent Intern", emoji: "📅", description: "Submit 14 daily reports", earned: stats.reports >= 14 },
    { name: "Report Master", emoji: "📝", description: "Submit 30 daily reports", earned: stats.reports >= 30 },
    { name: "7 Day Streak", emoji: "🔥", description: "Reach a 7-day reporting streak", earned: stats.longestStreak >= 7 },
    { name: "30 Day Streak", emoji: "⚡", description: "Reach a 30-day reporting streak", earned: stats.longestStreak >= 30 },
    { name: "Perfect Week", emoji: "✨", description: "Complete a week with full attendance & reports", earned: stats.perfectWeeks >= 1 },
    { name: "Verified Intern", emoji: "🛡️", description: "Have a verified certificate", earned: stats.verifiedCertificates >= 1 },
    { name: "Internship Finisher", emoji: "🎓", description: "Complete an internship", earned: stats.completed >= 1 },
    { name: "Internship Champion", emoji: "🏆", description: "Complete a verified internship", earned: stats.completed >= 1 && stats.verifiedInternship },
    { name: "Top Performer", emoji: "🥇", description: "Reach the top 3 of the leaderboard", earned: stats.rank <= 3 },
  ];
  return badges;
}

async function computeStudentRewards(ctx: QueryCtx, studentId: Id<"students">) {
  const config = await getConfig(ctx);
  const reports = await ctx.db
    .query("dailyReports")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const attendance = await ctx.db
    .query("attendance")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const weekly = await ctx.db
    .query("weeklyReports")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  const certificates = await ctx.db
    .query("certificates")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();

  const today = startOfDay(Date.now());
  const streaks = computeStreaks(reports.map((r) => r.date), today);

  // perfect weeks: weeks (within the last 16) with >=5 present days and >=5 reports
  let perfectWeeks = 0;
  const weekMap = new Map<number, { present: number; reports: number }>();
  for (const a of attendance) {
    if (a.status !== "present") continue;
    const ws = weekStart(a.date);
    const entry = weekMap.get(ws) ?? { present: 0, reports: 0 };
    entry.present += 1;
    weekMap.set(ws, entry);
  }
  for (const r of reports) {
    const ws = weekStart(r.date);
    const entry = weekMap.get(ws) ?? { present: 0, reports: 0 };
    entry.reports += 1;
    weekMap.set(ws, entry);
  }
  for (const [, entry] of weekMap) {
    if (entry.present >= 5 && entry.reports >= 5) perfectWeeks += 1;
  }

  const completed = enrollments.filter((e) => e.status === "completed").length;
  const verifiedCertificates = certificates.filter(
    (c) => c.verificationStatus === "verified",
  ).length;
  let verifiedInternship = false;
  for (const e of enrollments) {
    if (e.companyId) {
      const company = await ctx.db.get(e.companyId);
      if (company?.verificationStatus === "verified") {
        verifiedInternship = true;
        break;
      }
    }
  }

  const points =
    reports.length * config.dailyReportPoints +
    weekly.length * config.weeklyReportPoints +
    perfectWeeks * config.perfectWeekPoints +
    (streaks.longest >= 7 ? config.streak7Points : 0) +
    (streaks.longest >= 30 ? config.streak30Points : 0) +
    completed * config.completionPoints +
    (verifiedInternship ? config.verifiedInternshipPoints : 0) +
    verifiedCertificates * config.verifiedCertificatePoints;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0;

  return {
    points,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    reportDays: streaks.totalDays,
    reportsCount: reports.length,
    weeklyReports: weekly.length,
    presentCount,
    attendanceCount: attendance.length,
    attendancePct,
    completed,
    verifiedCertificates,
    verifiedInternship,
    perfectWeeks,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyRewards = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "student") return null;
    const student = await ctx.db
      .query("students")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!student) return null;

    const stats = await computeStudentRewards(ctx, student._id);
    const leaderboard = await computeLeaderboard(ctx);
    const rank =
      leaderboard.findIndex((l) => l.studentId === student._id) + 1 || 0;
    const badges = computeBadges(stats.points, {
      reports: stats.reportsCount,
      longestStreak: stats.longestStreak,
      perfectWeeks: stats.perfectWeeks,
      completed: stats.completed,
      verifiedCertificates: stats.verifiedCertificates,
      verifiedInternship: stats.verifiedInternship,
      rank,
    });
    const nextReward = computeNextReward(stats, badges);
    return {
      ...stats,
      rank,
      badges,
      config: await getConfig(ctx),
      nextReward,
      studentName: student.name,
    };
  },
});

export const leaderboard = query({
  args: {
    department: v.optional(v.string()),
    year: v.optional(v.number()),
    internshipOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await computeLeaderboard(ctx);
    let filtered = rows;
    if (args.department) {
      filtered = filtered.filter((r) => r.student.department === args.department);
    }
    if (args.year) filtered = filtered.filter((r) => r.student.year === args.year);
    if (args.internshipOnly) {
      filtered = filtered.filter((r) => r.stats.enrollmentActive);
    }
    return filtered.map((r, i) => ({
      ...r,
      rank: i + 1,
      badges: computeBadges(r.stats.points, {
        reports: r.stats.reportsCount,
        longestStreak: r.stats.longestStreak,
        perfectWeeks: r.stats.perfectWeeks,
        completed: r.stats.completed,
        verifiedCertificates: r.stats.verifiedCertificates,
        verifiedInternship: r.stats.verifiedInternship,
        rank: i + 1,
      }),
    }));
  },
});

async function computeLeaderboard(ctx: QueryCtx) {
  const students = await ctx.db.query("students").collect();
  const rows = [];
  for (const student of students) {
    const stats = await computeStudentRewards(ctx, student._id);
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    rows.push({
      studentId: student._id,
      student,
      stats: { ...stats, enrollmentActive: !!enrollment },
    });
  }
  rows.sort((a, b) => b.stats.points - a.stats.points || b.stats.longestStreak - a.stats.longestStreak);
  return rows;
}

function computeNextReward(
  stats: Awaited<ReturnType<typeof computeStudentRewards>>,
  badges: Array<{ name: string; earned: boolean }>,
) {
  const locked = badges.find((b) => !b.earned);
  if (locked) {
    return { name: locked.name, description: "Earn the next badge" };
  }
  return {
    name: `${Math.max(stats.longestStreak + 1, 7)} Day Streak`,
    description: "Keep your streak alive to unlock the next milestone",
  };
}

// ---------------------------------------------------------------------------
// Admin config
// ---------------------------------------------------------------------------

export const getRewardConfig = query({
  args: {},
  handler: async (ctx) => {
    return await getConfig(ctx);
  },
});

export const updateRewardConfig = mutation({
  args: {
    dailyReportPoints: v.number(),
    weeklyReportPoints: v.number(),
    perfectWeekPoints: v.number(),
    streak7Points: v.number(),
    streak30Points: v.number(),
    completionPoints: v.number(),
    verifiedInternshipPoints: v.number(),
    verifiedCertificatePoints: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requireRole(user, ["admin"]);
    const existing = await ctx.db.query("rewardConfig").first();
    const payload = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("rewardConfig", payload);
    }
    return { ok: true };
  },
});

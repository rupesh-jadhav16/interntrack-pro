import { query } from "./_generated/server";
import { getCurrentUser, startOfDay } from "./helpers";

export const myDeadlines = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();
    const today = startOfDay(now);

    const stored = await ctx.db
      .query("deadlines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const derived: Array<{
      title: string;
      type: string;
      dueDate: number;
      link?: string;
      source: string;
    }> = [];

    if (user.role === "student") {
      const student = await ctx.db
        .query("students")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (student) {
        // daily report deadline (11:59 PM today)
        const reports = await ctx.db
          .query("dailyReports")
          .withIndex("by_student_date", (q) =>
            q.eq("studentId", student._id).eq("date", today),
          )
          .first();
        if (!reports) {
          derived.push({
            title: "Today's daily report",
            type: "daily_report",
            dueDate: today + 23 * 3600000 + 59 * 60000,
            link: "/app/reports",
            source: "derived",
          });
        }
        // active enrollment completion
        const enrollment = await ctx.db
          .query("enrollments")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();
        if (enrollment && !stored.some((d) => d.type === "completion")) {
          derived.push({
            title: `Internship completion · ${enrollment.companyName}`,
            type: "completion",
            dueDate: enrollment.endDate,
            link: "/app/tracker",
            source: "derived",
          });
        }
        // weekly report deadline (Sunday 11:59 PM)
        const weekReports = await ctx.db
          .query("weeklyReports")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect();
        const ws = today - ((new Date(today).getDay() + 6) % 7) * 86400000;
        const weekEnd = ws + 6 * 86400000;
        if (!weekReports.some((w) => w.weekStart === ws)) {
          derived.push({
            title: "Weekly report deadline",
            type: "weekly_report",
            dueDate: weekEnd + 23 * 3600000 + 59 * 60000,
            link: "/app/reports",
            source: "derived",
          });
        }
      }
    }

    const all = [
      ...stored.map((d) => ({
        _id: d._id,
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        status: d.status,
        link: d.link,
        source: "stored",
      })),
      ...derived.map((d) => ({
        _id: `derived-${d.type}`,
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        status: computeStatus(d.dueDate, now),
        link: d.link,
        source: d.source,
      })),
    ];

    return all
      .map((d) => ({ ...d, status: computeStatus(d.dueDate, now) }))
      .sort((a, b) => a.dueDate - b.dueDate);
  },
});

function computeStatus(dueDate: number, now: number) {
  const dayDiff = Math.round((dueDate - now) / 86400000);
  if (dayDiff < 0) return "overdue";
  if (dayDiff === 0) return "due_today";
  return "upcoming";
}

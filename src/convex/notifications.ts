import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, requireUser } from "./helpers";

export const myNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return notifications.filter((n) => !n.read).length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of notifications.filter((n) => !n.read)) {
      await ctx.db.patch(n._id, { read: true });
    }
    return { ok: true };
  },
});

export const markOneRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const user = await requireUser(ctx);
    const n = await ctx.db.get(notificationId);
    if (n && n.userId === user._id) {
      await ctx.db.patch(notificationId, { read: true });
    }
    return { ok: true };
  },
});

export const announcements = query({
  args: {},
  handler: async (ctx) => {
    const announcements = await ctx.db.query("announcements").collect();
    return announcements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const announce = mutation({
  args: { title: v.string(), message: v.string(), audience: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Access denied");
    await ctx.db.insert("announcements", {
      title: args.title,
      message: args.message,
      audience: args.audience,
      createdBy: user.name ?? "T&P Cell",
      createdAt: Date.now(),
    });
    const users = await ctx.db.query("users").collect();
    let count = 0;
    for (const u of users) {
      if (args.audience === "all" || u.role === args.audience) {
        await ctx.db.insert("notifications", {
          userId: u._id,
          title: `📢 ${args.title}`,
          message: args.message,
          type: "announcement",
          read: false,
          createdAt: Date.now(),
        });
        count += 1;
      }
    }
    return { ok: true, delivered: count };
  },
});

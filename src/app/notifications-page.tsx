import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { timeAgo } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { EmptyState, PageHeader } from "./components/ui";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  reward: "bg-amber-400",
  announcement: "bg-indigo-500",
  info: "bg-sky-500",
};

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.myNotifications);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notifications"
        subtitle="Application updates, report reminders, streak milestones and announcements — all in one feed."
        actions={
          <Button
            variant="outline"
            className="border-slate-200 bg-white"
            onClick={() => markAllRead()}
          >
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />

      {notifications === undefined ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="h-16 animate-pulse rounded-xl border-slate-200/80" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" message="Updates about applications, reports and achievements will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n._id}
              className={cn(
                "flex cursor-pointer items-start gap-3.5 rounded-xl border-slate-200/80 p-4 transition-colors hover:border-indigo-200",
                !n.read && "border-indigo-100 bg-indigo-50/40",
              )}
              onClick={() => {
                if (n.link) navigate(n.link);
              }}
            >
              <div className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", TYPE_DOT[n.type] ?? "bg-slate-300")} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  <span className="text-[11px] font-medium text-slate-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-6 text-slate-600">{n.message}</p>
                {n.link && (
                  <p className="mt-1.5 text-xs font-semibold text-indigo-600">
                    {n.link.startsWith("/app") ? "Open →" : "View"}
                  </p>
                )}
              </div>
              {!n.read && <BellRing className="mt-1 size-4 shrink-0 text-indigo-400" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

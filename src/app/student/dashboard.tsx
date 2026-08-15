import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import {
  APPLICATION_STATUSES,
  formatDateShort,
  timeAgo,
} from "@/lib/constants";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Flame,
  Gift,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";
import { CompanyLogo, Heatmap, PageHeader, ProgressSteps, StatCard, StatusBadge } from "../components/ui";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboard() {
  const profile = useQuery(api.profiles.myStudentProfile);
  const rewards = useQuery(api.rewards.getMyRewards);
  const applications = useQuery(api.applications.myApplications);
  const enrollments = useQuery(api.enrollments.myEnrollments);
  const snapshot = useQuery(api.enrollments.todaySnapshot);
  const attendance = useQuery(api.attendance.myAttendance);
  const deadlines = useQuery(api.deadlines.myDeadlines);
  const notifications = useQuery(api.notifications.myNotifications);
  const internships = useQuery(api.internships.list, {});

  const loading = !profile || !rewards || !applications || !enrollments || !snapshot;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeEnrollment = enrollments?.find((e) => e.enrollment.status === "active");
  const activeApp = applications?.find((a) => a.application.status !== "rejected" && a.application.status !== "completed");
  const upcomingDeadline = deadlines?.find((d) => d.status !== "overdue");
  const presentCount = attendance?.filter((a) => a.status === "present").length ?? 0;
  const attendancePct = attendance?.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0;

  const heatmap = new Map<number, string>();
  attendance?.forEach((a) => heatmap.set(a.date, a.status));

  const recommended = internships?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard Overview"
        title={`Welcome back, ${profile?.name.split(" ")[0] ?? "there"}.`}
        subtitle={
          snapshot?.enrollment
            ? `You're interning at ${snapshot.enrollment.companyName} as a ${snapshot.enrollment.role}.`
            : "Your readiness profile is looking strong. Explore internships to get started."
        }
        actions={
          <Button asChild>
            <Link to="/app/reports">
              <ClipboardList className="size-4" />
              Submit today's report
            </Link>
          </Button>
        }
      />

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current streak"
          value={
            <span className="flex items-center gap-2">
              <Flame className="size-6 text-orange-500" />
              {rewards?.currentStreak ?? 0} days
            </span>
          }
          icon={Flame}
          accent="amber"
          hint={`Longest: ${rewards?.longestStreak ?? 0} days · ${rewards?.reportDays ?? 0} reports`}
        />
        <StatCard
          label="Total points"
          value={rewards?.points ?? 0}
          icon={Gift}
          hint={`Rank #${rewards?.rank ?? "—"} · ${rewards?.badges.filter((b) => b.earned).length ?? 0} badges earned`}
        />
        <StatCard
          label="Applications"
          value={applications?.length ?? 0}
          icon={FileText}
          hint={`${applications?.filter((a) => ["shortlisted", "interview", "selected"].includes(a.application.status)).length ?? 0} in active pipelines`}
        />
        <StatCard
          label="Attendance"
          value={`${attendancePct}%`}
          icon={CalendarCheck2}
          hint={`${presentCount} of ${attendance?.length ?? 0} days present`}
        />
      </div>

      {/* Today + internship + deadline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Target className="size-4 text-indigo-600" /> What do I need to do today?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <TodayTask
              label="Daily attendance"
              done={!!snapshot?.todaysAttendance}
              detail={
                snapshot?.todaysAttendance
                  ? `Checked in at ${snapshot.todaysAttendance.checkIn ?? "—"} · ${snapshot.todaysAttendance.hours ?? 0}h`
                  : "Check in for your internship"
              }
              href="/app/attendance"
            />
            <TodayTask
              label="Daily report"
              done={!!snapshot?.todaysReport}
              detail={
                snapshot?.todaysReport
                  ? "Submitted ✓ — pending mentor review"
                  : "Submit before 11:59 PM"
              }
              href="/app/reports"
            />
            <TodayTask
              label="Weekly report"
              done={(snapshot?.weekReportCount ?? 0) > 0}
              detail={`${snapshot?.weekReportCount ?? 0} of 5 daily reports this week`}
              href="/app/reports"
            />
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Briefcase className="size-4 text-indigo-600" /> Current internship
              </span>
              {activeEnrollment && (
                <StatusBadge
                  label="Active"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  dotClass="bg-emerald-500"
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeEnrollment ? (
              <div>
                <div className="flex items-center gap-3">
                  <CompanyLogo name={activeEnrollment.enrollment.companyName} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {activeEnrollment.enrollment.role}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {activeEnrollment.enrollment.companyName} · {activeEnrollment.enrollment.location}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activeEnrollment.presentCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Days present</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activeEnrollment.reportCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Reports</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activeEnrollment.weeklyCount}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Weekly</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link to="/app/tracker">
                    Open tracker <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Briefcase className="size-8 text-slate-200" />
                <p className="mt-2 text-sm font-medium text-slate-600">No active internship</p>
                <p className="mt-1 text-xs text-slate-400">Find your next role in the explorer.</p>
                <Button asChild size="sm" className="mt-3">
                  <Link to="/app/internships">Explore internships</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="size-4 text-indigo-600" /> Upcoming deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {deadlines?.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">No deadlines right now</p>
            )}
            {deadlines?.slice(0, 4).map((d) => (
              <div key={String(d._id)} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{d.title}</p>
                  <p className="text-[11px] text-slate-400">{formatDateShort(d.dueDate)}</p>
                </div>
                <StatusBadge
                  label={d.status === "due_today" ? "Due today" : d.status === "overdue" ? "Overdue" : d.status === "upcoming" ? "Upcoming" : "Done"}
                  className={
                    d.status === "due_today"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : d.status === "overdue"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-600"
                  }
                  dotClass={d.status === "due_today" ? "bg-amber-500" : d.status === "overdue" ? "bg-rose-500" : "bg-slate-300"}
                />
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full text-indigo-600">
              <Link to="/app/deadlines">View all deadlines</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Applications + heatmap */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-600" /> Current applications
              </span>
              <Link to="/app/applications" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {applications?.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                No applications yet — explore internships to apply.
              </p>
            )}
            {applications?.slice(0, 3).map(({ application, internship, company }) => (
              <div key={application._id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyLogo name={company?.name ?? "?"} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{internship?.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {company?.name} · {internship?.city} ({internship?.mode})
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                    className={APPLICATION_STATUSES[application.status]?.color}
                    dotClass={APPLICATION_STATUSES[application.status]?.dot}
                  />
                </div>
                <div className="mt-4">
                  <ProgressSteps steps={["Applied", "Shortlisted", "Interview", "Selected"]} current={application.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Flame className="size-4 text-orange-500" /> Activity streak
              </span>
              <Badge className="rounded-full border-orange-200 bg-orange-50 px-2.5 text-[11px] font-bold text-orange-600">
                {rewards?.currentStreak ?? 0} Day Streak 🔥
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap values={heatmap} today={Date.now()} />
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-yellow-400" /> Pending</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-slate-100" /> No report</span>
              </div>
              <span>Last {98 / 7} weeks</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications + recommended */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2"><Bell className="size-4 text-indigo-600" /> Recent notifications</span>
              <Link to="/app/notifications" className="text-xs font-semibold text-indigo-600">All →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {notifications?.slice(0, 4).map((n) => (
              <div key={n._id} className="flex gap-2.5 rounded-lg px-2 py-1.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{n.title}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{n.message}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2"><Sparkles className="size-4 text-indigo-600" /> Recommended for you</span>
              <Link to="/app/internships" className="text-xs font-semibold text-indigo-600">Explore all →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {recommended.map(({ internship, company }) => (
              <Link
                key={internship._id}
                to="/app/internships"
                className="group rounded-xl border border-slate-100 p-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="flex items-center justify-between">
                  <CompanyLogo name={company?.name ?? "?"} size="sm" />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {internship.type === "fulltime" ? "Full-time" : internship.type === "parttime" ? "Part-time" : "Summer"}
                  </span>
                </div>
                <p className="mt-2.5 truncate text-[13px] font-bold text-slate-900">{internship.title}</p>
                <p className="truncate text-[11px] text-slate-500">{company?.name} · {internship.mode === "remote" ? "Remote" : internship.city}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <TrendingUp className="size-3" /> {internship.paid ? internship.stipend : "Unpaid"}
                </p>
                <p className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><MapPin className="size-3" /> {internship.city}</span>
                  <span className="font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">Apply →</span>
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TodayTask({
  label,
  done,
  detail,
  href,
}: {
  label: string;
  done: boolean;
  detail: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
    >
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        ) : (
          <span className="size-4 shrink-0 rounded-full border-2 border-slate-300" />
        )}
        <div>
          <p className="text-[13px] font-semibold text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400">{detail}</p>
        </div>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-slate-300" />
    </Link>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ClipboardList,
  Flame,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { PageHeader, StatCard } from "../components/ui";
import { Skeleton } from "@/components/ui/skeleton";

export default function FacultyDashboard() {
  const summary = useQuery(api.faculty.dashboardSummary);
  const students = useQuery(api.faculty.myStudents);
  const weekly = useQuery(api.reports.weeklySummaries);

  if (!summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const atRisk = students?.filter((s) => s.atRisk) ?? [];
  const pending = (students ?? []).reduce((sum, s) => sum + s.pendingReports, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Faculty Overview"
        title="Which students need your attention?"
        subtitle="Monitor attendance, verify reports and catch at-risk interns before they fall behind."
        actions={
          <Button asChild variant="outline" className="border-slate-200 bg-white">
            <Link to="/app/reports">
              <ClipboardList className="size-4" /> Review reports ({pending})
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned students" value={summary.totalStudents} icon={Users} accent="primary" />
        <StatCard label="Active internships" value={summary.activeInternships} icon={TrendingUp} accent="emerald" hint={`${summary.completedInternships} completed`} />
        <StatCard label="Students at risk" value={summary.studentsAtRisk} icon={AlertTriangle} accent="rose" />
        <StatCard label="Pending reports" value={summary.pendingReports} icon={ClipboardList} accent="amber" hint={`${summary.pendingWeekly} weekly pending`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Flame className="size-4 text-orange-500" /> Engagement health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <HealthRow label="Average attendance" value={`${summary.avgAttendance}%`} />
            <HealthRow label="Completion rate" value={`${summary.completionPct}%`} />
            <HealthRow label="Broken streaks" value={summary.brokenStreaks} />
            <HealthRow label="Weekly reports pending" value={summary.pendingWeekly} />
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" /> Needs attention
              </span>
              <Link to="/app/students" className="text-xs font-semibold text-indigo-600">All students →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {atRisk.length === 0 && (
              <p className="py-6 text-center text-[13px] text-slate-400">
                All your students are on track 🎉
              </p>
            )}
            {atRisk.map((s) => (
              <div key={s.student._id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                    {s.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{s.student.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {s.companyName ?? "No active internship"} · streak {s.streak}d · attendance {s.attendancePct}%
                    </p>
                  </div>
                </div>
                <Link to="/app/students" className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700">
                  Review →
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Weekly summaries */}
      <Card className="card-elevated rounded-xl border-slate-200/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <TrendingUp className="size-4 text-indigo-600" /> This week's internship summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weekly === undefined ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : weekly.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">No active internships this week.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {weekly.map((w) => (
                <div key={w.student._id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{w.student.name}</p>
                      <p className="text-[11px] text-slate-500">{w.enrollment ? `${w.enrollment.companyName} · ${w.enrollment.role}` : "No active internship"}</p>
                    </div>
                    {w.atRisk ? (
                      <Badge className="rounded-full border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-600">At risk</Badge>
                    ) : (
                      <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-600">On track</Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <SummaryStat label="Attendance" value={`${w.attendancePercentage}%`} />
                    <SummaryStat label="Reports" value={`${w.reportCount}/5`} />
                    <SummaryStat label="Hours" value={w.totalHours} />
                    <SummaryStat
                      label="Weekly report"
                      value={w.weeklyReportStatus === "approved" ? "✓" : w.weeklyReportStatus === "pending" ? "…" : "—"}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-2">
      <span className="text-[13px] text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50/70 py-2">
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { ATTENDANCE_STATUSES, REPORT_STATUSES, formatDate } from "@/lib/constants";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarCheck2,
  ClipboardList,
  Flame,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function FacultyStudents() {
  const students = useQuery(api.faculty.myStudents);
  const [selected, setSelected] = useState<string | null>(null);

  const engagement = useQuery(
    api.enrollments.internEngagement,
    selected ? { studentId: selected as never } : "skip",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Students"
        title="Assigned students"
        subtitle="Every student assigned to you — their attendance, streaks, pending reports and risk flags at a glance."
      />

      {students === undefined ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-20 animate-pulse rounded-xl border-slate-200/80" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students assigned yet"
          message="The T&P Cell assigns students to faculty. Check back after the next batch."
        />
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card
              key={s.student._id}
              className="card-elevated flex cursor-pointer flex-col gap-4 rounded-xl border-slate-200/80 p-4 transition-all hover:border-indigo-200 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => setSelected(s.student._id as string)}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    s.atRisk
                      ? "bg-gradient-to-br from-rose-500 to-orange-400"
                      : "bg-gradient-to-br from-indigo-500 to-sky-400",
                  )}
                >
                  {s.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{s.student.name}</p>
                    {s.atRisk && (
                      <Badge className="rounded-full border-rose-200 bg-rose-50 text-[9px] font-semibold text-rose-600">
                        <AlertTriangle className="size-2.5" /> At risk
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {s.student.department} · Year {s.student.year} · {s.companyName ?? "No active internship"}
                  </p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-4 gap-4 text-center sm:grid-cols-5">
                <Cell icon={<CalendarCheck2 className="size-3.5 text-indigo-500" />} label="Att." value={`${s.attendancePct}%`} />
                <Cell icon={<Flame className="size-3.5 text-orange-500" />} label="Streak" value={`${s.streak}d`} />
                <Cell icon={<ClipboardList className="size-3.5 text-slate-400" />} label="Reports" value={s.reportCount} />
                <Cell label="Pending" value={s.pendingReports} warn={s.pendingReports > 0} />
                <div className="hidden items-center sm:flex">
                  <Button size="sm" variant="outline" className="border-slate-200 bg-white text-xs">View →</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
          {engagement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {engagement.student?.name}
                  <StatusBadge
                    label={engagement.enrollment.status}
                    className={
                      engagement.enrollment.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }
                    dotClass={engagement.enrollment.status === "active" ? "bg-emerald-500" : "bg-slate-400"}
                  />
                </DialogTitle>
                <DialogDescription>
                  {engagement.enrollment.companyName} · {engagement.enrollment.role} · {formatDate(engagement.enrollment.startDate)} → {formatDate(engagement.enrollment.endDate)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent attendance</p>
                  <div className="space-y-1.5">
                    {engagement.attendance.slice(0, 7).map((a) => (
                      <div key={a._id} className="flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-2 text-[12px]">
                        <span className="font-medium text-slate-700">{formatDate(a.date)}</span>
                        <span className="text-slate-400">{a.hours ? `${a.hours}h` : "—"}</span>
                        <StatusBadge
                          label={ATTENDANCE_STATUSES[a.status]?.label ?? a.status}
                          className={ATTENDANCE_STATUSES[a.status]?.color}
                          dotClass={ATTENDANCE_STATUSES[a.status]?.heat}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent daily reports</p>
                  <div className="space-y-1.5">
                    {engagement.dailyReports.slice(0, 4).map((r) => (
                      <div key={r._id} className="rounded-lg border border-slate-100 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-bold text-slate-800">{formatDate(r.date)} · {r.hours}h</p>
                          <StatusBadge
                            label={REPORT_STATUSES[r.status]?.label ?? r.status}
                            className={REPORT_STATUSES[r.status]?.color}
                            dotClass={r.status === "approved" ? "bg-emerald-500" : r.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}
                          />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] text-slate-600">{r.tasksCompleted}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {engagement.feedback.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Feedback</p>
                    <div className="space-y-1.5">
                      {engagement.feedback.map((f) => (
                        <div key={f._id} className="rounded-lg bg-indigo-50/60 px-3 py-2.5 text-[12px] text-indigo-900">
                          <p className="font-bold">{f.author} ({f.authorRole})</p>
                          <p className="mt-0.5">{f.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button asChild variant="outline" className="w-full">
                  <Link to="/app/reports">Verify pending reports for this student →</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  warn,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="text-center">
      <p className={cn("flex items-center justify-center gap-1 text-[13px] font-bold", warn ? "text-rose-600" : "text-slate-800")}>
        {icon} {value}
      </p>
      <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

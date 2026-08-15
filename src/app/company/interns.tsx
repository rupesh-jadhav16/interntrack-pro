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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { ATTENDANCE_STATUSES, REPORT_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CalendarCheck2, CheckCircle2, MessageSquare, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function CompanyInterns() {
  const interns = useQuery(api.enrollments.companyInterns);
  const [selected, setSelected] = useState<string | null>(null);

  const engagement = useQuery(
    api.enrollments.internEngagement,
    selected ? { studentId: selected as never } : "skip",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interns"
        title="Current interns"
        subtitle="Students interning at your company — review their attendance, daily reports and weekly summaries. You only see data for your own interns."
      />

      {interns === undefined ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-24 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : interns.length === 0 ? (
        <EmptyState icon={CalendarCheck2} title="No interns yet" message="Once you select candidates and they activate their tracker, their progress appears here." />
      ) : (
        <div className="space-y-3">
          {interns.map(({ enrollment, student, presentCount, attendanceCount, reportCount }) => (
            <Card
              key={enrollment._id}
              className="card-elevated cursor-pointer rounded-xl border-slate-200/80 p-4 transition-all hover:border-indigo-200"
              onClick={() => setSelected(student?._id as string ?? null)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-400 text-xs font-bold text-white">
                    {student?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{student?.name}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {enrollment.role} · {formatDate(enrollment.startDate)} → {formatDate(enrollment.endDate)}
                    </p>
                    <p className="text-[11px] text-slate-400">Mentor: {enrollment.mentor}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                    {presentCount}/{attendanceCount} days present
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                    {reportCount} reports
                  </Badge>
                  <Badge
                    className={`rounded-full text-[10px] font-semibold ${enrollment.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                    variant="outline"
                  >
                    {enrollment.status === "active" ? "Active" : "Completed"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
          {engagement && <InternDetail studentId={selected!} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InternDetail({ studentId }: { studentId: string }) {
  const engagement = useQuery(api.enrollments.internEngagement, { studentId: studentId as never });
  const reviewWeekly = useMutation(api.reports.reviewWeekly);
  const addFeedback = useMutation(api.feedback.add);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  if (!engagement) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }

  const handleWeekly = async (reportId: string, approve: boolean) => {
    try {
      await reviewWeekly({ reportId: reportId as never, approve });
      toast.success(approve ? "Weekly report approved" : "Weekly report rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackBusy(true);
    try {
      await addFeedback({ studentId: studentId as never, text: feedbackText });
      toast.success("Feedback sent to intern");
      setFeedbackText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{engagement.student?.name}</DialogTitle>
        <DialogDescription>
          {engagement.enrollment.companyName} · {engagement.enrollment.role} · {formatDate(engagement.enrollment.startDate)} → {formatDate(engagement.enrollment.endDate)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent attendance</p>
          <div className="space-y-1.5">
            {engagement.attendance.slice(0, 6).map((a) => (
              <div key={a._id} className="flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-2 text-[12px]">
                <span className="font-medium text-slate-700">{formatDate(a.date)}</span>
                <span className="text-slate-400">{a.hours ? `${a.hours}h` : "—"} · {a.checkIn ?? ""}{a.checkIn && a.checkOut ? "–" : ""}{a.checkOut ?? ""}</span>
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
            {engagement.dailyReports.slice(0, 3).map((r) => (
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

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Weekly reports</p>
          <div className="space-y-2">
            {engagement.weeklyReports.slice(0, 3).map((r) => (
              <div key={r._id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-slate-800">Week of {formatDate(r.weekStart)}</p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      label={REPORT_STATUSES[r.status]?.label ?? r.status}
                      className={REPORT_STATUSES[r.status]?.color}
                      dotClass={r.status === "approved" ? "bg-emerald-500" : r.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}
                    />
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" className="h-7 bg-emerald-600 px-2 text-[11px]" onClick={() => handleWeekly(r._id as string, true)}>
                          <CheckCircle2 className="size-3" /> OK
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 border-rose-200 bg-rose-50 px-2 text-[11px] text-rose-700" onClick={() => handleWeekly(r._id as string, false)}>
                          <XCircle className="size-3" /> Revise
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-slate-600">{r.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {engagement.feedback.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Feedback history</p>
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

        <form onSubmit={handleFeedback} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Send feedback</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={2} placeholder="Constructive feedback for this intern…" className="pl-8" required />
            </div>
            <Button type="submit" disabled={feedbackBusy} className="self-start">
              <Send className="size-3.5" /> Send
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

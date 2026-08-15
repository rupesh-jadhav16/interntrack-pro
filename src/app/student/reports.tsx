import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { REPORT_STATUSES, formatDate, formatDateShort } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentReports() {
  const daily = useQuery(api.reports.myDailyReports);
  const weekly = useQuery(api.reports.myWeeklyReports);
  const enrollments = useQuery(api.enrollments.myEnrollments);
  const submitDaily = useMutation(api.reports.submitDaily);
  const submitWeekly = useMutation(api.reports.submitWeekly);

  const activeEnrollment = enrollments?.find((e) => e.enrollment.status === "active");

  const [tasks, setTasks] = useState("");
  const [learned, setLearned] = useState("");
  const [problems, setProblems] = useState("");
  const [hours, setHours] = useState("8");
  const [tomorrow, setTomorrow] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [wTasks, setWTasks] = useState("");
  const [wSkills, setWSkills] = useState("");
  const [wProblems, setWProblems] = useState("");
  const [wProgress, setWProgress] = useState("");
  const [wSummary, setWSummary] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  const draft = useQuery(
    api.reports.generateWeeklyDraft,
    activeEnrollment ? { enrollmentId: activeEnrollment.enrollment._id as never } : "skip",
  );

  const handleDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrollment) return;
    setSubmitting(true);
    try {
      await submitDaily({
        enrollmentId: activeEnrollment.enrollment._id as never,
        tasksCompleted: tasks,
        learned,
        problems,
        hours: Number(hours),
        tomorrowPlan: tomorrow,
      });
      toast.success("Daily report submitted ✓", {
        description: "Your faculty mentor has been notified for review.",
      });
      setTasks(""); setLearned(""); setProblems(""); setTomorrow("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrollment) return;
    setWSubmitting(true);
    try {
      await submitWeekly({
        enrollmentId: activeEnrollment.enrollment._id as never,
        weekStartTs: Date.now(),
        totalWorkingDays: draft?.totalWorkingDays ?? 0,
        attendancePercentage: draft?.attendancePercentage ?? 0,
        totalHours: draft?.totalHours ?? 0,
        tasksCompleted: (wTasks || draft?.tasksCompleted.join("; ") || "").split(";").map((s) => s.trim()).filter(Boolean),
        skillsLearned: wSkills.split(",").map((s) => s.trim()).filter(Boolean),
        problemsFaced: wProblems.split(";").map((s) => s.trim()).filter(Boolean),
        overallProgress: wProgress,
        summary: wSummary || draft?.summary || "",
      });
      toast.success("Weekly report submitted ✓", {
        description: "Your faculty and the T&P Cell have been notified.",
      });
      setWProgress(""); setWSummary("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setWSubmitting(false);
    }
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todaysReport = daily?.find(({ report }) => {
    const d = new Date(report.date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Daily & weekly reports"
        subtitle="Submit your daily work log and weekly summary. Reports are sent to your faculty mentor and the T&P Cell."
      />

      {!activeEnrollment && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
          You need an active internship tracker to submit reports. Activate one from the Internship Tracker page.
        </div>
      )}

      <Tabs defaultValue="daily" className="space-y-5">
        <TabsList className="rounded-xl border border-slate-200 bg-white p-1">
          <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <CalendarCheck2 className="size-4" /> Daily Report
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <ClipboardList className="size-4" /> Weekly Report
          </TabsTrigger>
        </TabsList>

        {/* DAILY */}
        <TabsContent value="daily" className="space-y-5">
          <Card className="card-elevated rounded-xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-indigo-600" /> Today's report — {today.toDateString()}
                </span>
                {todaysReport && (
                  <StatusBadge
                    label={REPORT_STATUSES[todaysReport.report.status]?.label}
                    className={REPORT_STATUSES[todaysReport.report.status]?.color}
                    dotClass={todaysReport.report.status === "approved" ? "bg-emerald-500" : "bg-amber-500"}
                  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysReport?.report.status === "approved" ? (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-emerald-50 px-4 py-8 text-center">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-800">Daily Report Submitted ✓</p>
                  <p className="text-xs text-emerald-600">
                    Your report was reviewed and approved by your faculty mentor.
                    {todaysReport.report.feedback ? ` Feedback: "${todaysReport.report.feedback}"` : ""}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDaily} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hours worked">
                      <Input type="number" min="0" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} required />
                    </Field>
                    <Field label="Date">
                      <Input value={formatDate(Date.now())} disabled className="bg-slate-50 text-slate-500" />
                    </Field>
                  </div>
                  <Field label="Tasks completed">
                    <Textarea value={tasks} onChange={(e) => setTasks(e.target.value)} rows={2} placeholder="What did you finish today?" required />
                  </Field>
                  <Field label="What I learned">
                    <Textarea value={learned} onChange={(e) => setLearned(e.target.value)} rows={2} placeholder="New skills, tools, concepts…" required />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Problems faced">
                      <Textarea value={problems} onChange={(e) => setProblems(e.target.value)} rows={2} placeholder="Anything that blocked you?" />
                    </Field>
                    <Field label="Tomorrow's plan">
                      <Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} rows={2} placeholder="What's next?" required />
                    </Field>
                  </div>
                  {todaysReport && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      You already submitted today — resubmitting will send an updated version for review.
                    </p>
                  )}
                  <Button type="submit" disabled={submitting || !activeEnrollment} className="w-full sm:w-auto">
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {todaysReport ? "Resubmit report" : "Submit daily report"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Report history</p>
            {daily === undefined ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Card key={i} className="h-16 animate-pulse rounded-xl border-slate-200/80" />)}</div>
            ) : daily.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" message="Your submitted daily reports will appear here." />
            ) : (
              <div className="space-y-2.5">
                {daily.map(({ report, enrollment }) => (
                  <Card key={report._id} className="rounded-xl border-slate-200/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-bold text-slate-900">{formatDate(report.date)}</p>
                          <span className="text-[11px] text-slate-400">· {report.hours}h · {enrollment?.companyName}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{report.tasksCompleted}</p>
                        {report.feedback && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-500">
                            <MessageSquare className="mt-0.5 size-3 shrink-0" /> Faculty: {report.feedback}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        label={REPORT_STATUSES[report.status]?.label ?? report.status}
                        className={REPORT_STATUSES[report.status]?.color}
                        dotClass={report.status === "approved" ? "bg-emerald-500" : report.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* WEEKLY */}
        <TabsContent value="weekly" className="space-y-5">
          {draft && (
            <Card className="card-elevated rounded-xl border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Sparkles className="size-4 text-indigo-600" /> This week's report
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    Auto-drafted from your daily logs
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <Stat label="Working days" value={draft.totalWorkingDays} />
                  <Stat label="Attendance" value={`${draft.attendancePercentage}%`} />
                  <Stat label="Hours logged" value={draft.totalHours} />
                </div>
                <form onSubmit={handleWeekly} className="space-y-4">
                  <Field label="Tasks completed (separate with ;)">
                    <Textarea
                      value={wTasks}
                      onChange={(e) => setWTasks(e.target.value)}
                      rows={2}
                      placeholder={draft.tasksCompleted.join("; ")}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Skills learned (comma separated)">
                      <Input value={wSkills} onChange={(e) => setWSkills(e.target.value)} placeholder="TypeScript, SQL" />
                    </Field>
                    <Field label="Problems faced (separate with ;)">
                      <Input value={wProblems} onChange={(e) => setWProblems(e.target.value)} placeholder="Environment setup delays" />
                    </Field>
                  </div>
                  <Field label="Overall progress">
                    <Textarea value={wProgress} onChange={(e) => setWProgress(e.target.value)} rows={2} placeholder="How is the internship going overall?" />
                  </Field>
                  <Field label="Summary">
                    <Textarea value={wSummary} onChange={(e) => setWSummary(e.target.value)} rows={2} placeholder={draft.summary} />
                  </Field>
                  <Button type="submit" disabled={wSubmitting || !activeEnrollment}>
                    {wSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Submit weekly report
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Weekly report history</p>
            {weekly === undefined ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Card key={i} className="h-20 animate-pulse rounded-xl border-slate-200/80" />)}</div>
            ) : weekly.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No weekly reports yet" message="Weekly summaries of your daily activity will appear here." />
            ) : (
              <div className="space-y-2.5">
                {weekly.map(({ report, enrollment }) => (
                  <Card key={report._id} className="rounded-xl border-slate-200/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-bold text-slate-900">
                            Week of {formatDateShort(report.weekStart)}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            · {report.attendancePercentage}% attendance · {report.totalHours}h
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{report.summary}</p>
                        {report.feedback && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-500">
                            <MessageSquare className="mt-0.5 size-3 shrink-0" /> Review: {report.feedback}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        label={REPORT_STATUSES[report.status]?.label ?? report.status}
                        className={REPORT_STATUSES[report.status]?.color}
                        dotClass={report.status === "approved" ? "bg-emerald-500" : report.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}
                      />
                    </div>
                    {enrollment && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                        {report.tasksCompleted.map((t, i) => (
                          <Badge key={i} variant="outline" className="rounded-md border-slate-200 text-[10px] font-medium text-slate-500">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-center")}>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

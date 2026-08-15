import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { formatDate, formatDateShort } from "@/lib/constants";
import { useMutation, useQuery, type ReactMutation } from "convex/react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function FacultyReports() {
  const students = useQuery(api.faculty.myStudents) ?? [];
  const reviewDaily = useMutation(api.reports.reviewDaily);
  const reviewWeekly = useMutation(api.reports.reviewWeekly);

  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const myStudents = students;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports Review"
        title="Verify student reports"
        subtitle="Approve daily and weekly reports, add comments, and keep students on track."
      />

      <Tabs defaultValue="daily" className="space-y-5">
        <TabsList className="rounded-xl border border-slate-200 bg-white p-1">
          <TabsTrigger value="daily" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Daily reports
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Weekly reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-3">
          <StudentDailyRows
            students={myStudents}
            reviewDaily={reviewDaily}
            feedback={feedback}
            setFeedback={setFeedback}
          />
        </TabsContent>
        <TabsContent value="weekly" className="space-y-3">
          <StudentWeeklyRows
            students={myStudents}
            reviewWeekly={reviewWeekly}
            feedback={feedback}
            setFeedback={setFeedback}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentDailyRows({
  students,
  reviewDaily,
  feedback,
  setFeedback,
}: {
  students: Array<{ student: { _id: string; name: string } }>;
  reviewDaily: ReactMutation<typeof api.reports.reviewDaily>;
  feedback: Record<string, string>;
  setFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <>
      {students.length === 0 && (
        <EmptyState icon={ClipboardList} title="No students assigned" message="Reports will appear here once students are assigned to you." />
      )}
      {students.map((s) => (
        <DailyForStudent
          key={s.student._id}
          student={s.student}
          reviewDaily={reviewDaily}
          feedback={feedback}
          setFeedback={setFeedback}
          busy={busy}
          setBusy={setBusy}
        />
      ))}
    </>
  );
}

function DailyForStudent({
  student,
  reviewDaily,
  feedback,
  setFeedback,
  busy,
  setBusy,
}: {
  student: { _id: string; name: string };
  reviewDaily: ReactMutation<typeof api.reports.reviewDaily>;
  feedback: Record<string, string>;
  setFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: string | null;
  setBusy: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const engagement = useQuery(api.enrollments.internEngagement, { studentId: student._id as never });
  const pending = engagement?.dailyReports.filter((r) => r.status === "pending") ?? [];

  const handle = async (reportId: string, approve: boolean) => {
    setBusy(reportId);
    try {
      await reviewDaily({ reportId: reportId as never, approve, feedback: feedback[reportId] || undefined });
      toast.success(approve ? "Report approved" : "Report sent back for revision");
      setFeedback((f) => ({ ...f, [reportId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <p className="text-sm font-bold text-slate-900">{student.name}</p>
      {pending.length === 0 ? (
        <p className="mt-2 text-[12px] text-slate-400">No pending reports 🎉</p>
      ) : (
        <div className="mt-3 space-y-3">
          {pending.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-100 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">{formatDate(r.date)} · {r.hours}h</p>
                <StatusBadge label="Pending" className="border-amber-200 bg-amber-50 text-amber-700" dotClass="bg-amber-500" />
              </div>
              <div className="mt-2 grid gap-2 text-[12px] leading-5 text-slate-600 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-400">Tasks:</span> {r.tasksCompleted}</p>
                <p><span className="font-semibold text-slate-400">Learned:</span> {r.learned}</p>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MessageSquare className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    value={feedback[r._id as string] ?? ""}
                    onChange={(e) => setFeedback((f) => ({ ...f, [r._id as string]: e.target.value }))}
                    placeholder="Add a comment (optional)"
                    className="h-9 rounded-lg pl-8 text-[12px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    disabled={busy === r._id as string}
                    onClick={() => handle(r._id as string, false)}
                  >
                    <XCircle className="size-3.5" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy === r._id as string}
                    onClick={() => handle(r._id as string, true)}
                  >
                    <CheckCircle2 className="size-3.5" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StudentWeeklyRows({
  students,
  reviewWeekly,
  feedback,
  setFeedback,
}: {
  students: Array<{ student: { _id: string; name: string } }>;
  reviewWeekly: ReactMutation<typeof api.reports.reviewWeekly>;
  feedback: Record<string, string>;
  setFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <>
      {students.length === 0 && (
        <EmptyState icon={ClipboardList} title="No students assigned" />
      )}
      {students.map((s) => (
        <WeeklyForStudent
          key={s.student._id}
          student={s.student}
          reviewWeekly={reviewWeekly}
          feedback={feedback}
          setFeedback={setFeedback}
          busy={busy}
          setBusy={setBusy}
        />
      ))}
    </>
  );
}

function WeeklyForStudent({
  student,
  reviewWeekly,
  feedback,
  setFeedback,
  busy,
  setBusy,
}: {
  student: { _id: string; name: string };
  reviewWeekly: ReactMutation<typeof api.reports.reviewWeekly>;
  feedback: Record<string, string>;
  setFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: string | null;
  setBusy: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const engagement = useQuery(api.enrollments.internEngagement, { studentId: student._id as never });
  const pending = engagement?.weeklyReports.filter((r) => r.status === "pending") ?? [];

  const handle = async (reportId: string, approve: boolean) => {
    setBusy(reportId);
    try {
      await reviewWeekly({ reportId: reportId as never, approve, feedback: feedback[reportId] || undefined });
      toast.success(approve ? "Weekly report approved" : "Weekly report sent back");
      setFeedback((f) => ({ ...f, [reportId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <p className="text-sm font-bold text-slate-900">{student.name}</p>
      {pending.length === 0 ? (
        <p className="mt-2 text-[12px] text-slate-400">No pending weekly reports</p>
      ) : (
        <div className="mt-3 space-y-3">
          {pending.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-100 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-800">
                  Week of {formatDateShort(r.weekStart)}
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-semibold text-slate-500">
                    {r.attendancePercentage}% attendance
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-semibold text-slate-500">
                    {r.totalHours}h
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-slate-600">{r.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.tasksCompleted.slice(0, 4).map((t, i) => (
                  <span key={i} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{t}</span>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MessageSquare className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    value={feedback[r._id as string] ?? ""}
                    onChange={(e) => setFeedback((f) => ({ ...f, [r._id as string]: e.target.value }))}
                    placeholder="Add a comment (optional)"
                    className="h-9 rounded-lg pl-8 text-[12px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={busy === r._id as string} onClick={() => handle(r._id as string, false)}>
                    <XCircle className="size-3.5" /> Reject
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === r._id as string} onClick={() => handle(r._id as string, true)}>
                    <CheckCircle2 className="size-3.5" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

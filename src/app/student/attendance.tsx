import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function StudentAttendance() {
  const attendance = useQuery(api.attendance.myAttendance);
  const enrollments = useQuery(api.enrollments.myEnrollments);
  const submit = useMutation(api.attendance.submit);

  const [status, setStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [summary, setSummary] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [busy, setBusy] = useState(false);

  const activeEnrollment = enrollments?.find((e) => e.enrollment.status === "active");
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todaysEntry = attendance?.find((a) => a.date === todayStart);

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, leave: 0, holiday: 0, pending: 0 };
    attendance?.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status] += 1;
    });
    const total = attendance?.length ?? 0;
    const present = counts.present;
    return {
      ...counts,
      total,
      pct: total ? Math.round((present / total) * 100) : 0,
      verified: attendance?.filter((a) => a.mentorVerified).length ?? 0,
      hours: attendance?.reduce((sum, a) => sum + (a.hours ?? 0), 0) ?? 0,
    };
  }, [attendance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrollment) return;
    setBusy(true);
    try {
      const tasks = taskInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await submit({
        enrollmentId: activeEnrollment.enrollment._id as never,
        status: status as never,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        summary: summary || undefined,
        tasks: tasks.length ? tasks : undefined,
      });
      toast.success("Attendance submitted", {
        description: "Your entry is now visible to your faculty mentor.",
      });
      setSummary("");
      setTaskInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Daily attendance"
        subtitle="Check in, log your hours and submit a work summary. Faculty mentors verify entries."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Attendance rate" value={`${stats.pct}%`} />
        <MiniStat label="Days present" value={stats.present} />
        <MiniStat label="Total hours" value={`${Math.round(stats.hours * 10) / 10}h`} />
        <MiniStat label="Mentor verified" value={stats.verified} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <LogIn className="size-4 text-indigo-600" /> Today's entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activeEnrollment ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Activate an internship tracker to log attendance.
              </p>
            ) : todaysEntry ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <p className="text-[13px] font-semibold text-emerald-700">
                    Logged for today — {ATTENDANCE_STATUSES[todaysEntry.status]?.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[13px]">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Check-in</p>
                    <p className="font-bold text-slate-800">{todaysEntry.checkIn ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Check-out</p>
                    <p className="font-bold text-slate-800">{todaysEntry.checkOut ?? "—"}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-[13px]">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Hours</p>
                  <p className="font-bold text-slate-800">{todaysEntry.hours ?? 0}h</p>
                </div>
                {todaysEntry.summary && (
                  <p className="text-[13px] leading-6 text-slate-600">{todaysEntry.summary}</p>
                )}
                <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                  <ShieldCheck className="size-3.5" />
                  {todaysEntry.mentorVerified ? "Verified by mentor" : "Pending mentor verification"}
                </div>
                <p className="text-[11px] text-slate-400">
                  You can still update today's entry below.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Status">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ATTENDANCE_STATUSES).map(([value, s]) => (
                        <SelectItem key={value} value={value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Check-in">
                    <div className="relative">
                      <LogIn className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                      <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="pl-8" />
                    </div>
                  </Field>
                  <Field label="Check-out">
                    <div className="relative">
                      <LogOut className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                      <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="pl-8" />
                    </div>
                  </Field>
                </div>
                <Field label="Work summary">
                  <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="What did you work on today?" />
                </Field>
                <Field label="Tasks completed (comma separated)">
                  <Input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="API integration, code review" />
                </Field>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Submit attendance
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-indigo-600" /> Calendar view
              </span>
              <div className="flex gap-2.5 text-[10px] text-slate-400">
                {Object.entries(ATTENDANCE_STATUSES).map(([k, s]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={cn("size-2 rounded-[3px]", s.heat)} /> {s.label}
                  </span>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance === undefined ? (
              <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
            ) : attendance.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No attendance logged" message="Your entries will build this calendar." />
            ) : (
              <MonthCalendar attendance={attendance} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MonthCalendar({ attendance }: { attendance: Array<{ date: number; status: string }> }) {
  const map = new Map<number, string>();
  attendance.forEach((a) => map.set(a.date, a.status));

  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // previous + current month for context
  const cells: Array<{ day: number; ts: number; inMonth: boolean }> = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const d = prevMonthDays - firstDay + 1 + i;
    cells.push({ day: d, ts: new Date(year, month - 1, d).getTime(), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, ts: new Date(year, month, d).getTime(), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const next = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: next, ts: new Date(year, month + 1, next).getTime(), inMonth: false });
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((w) => (
          <p key={w} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {w}
          </p>
        ))}
        {cells.map((cell, i) => {
          const status = map.get(cell.ts);
          const isToday = cell.ts === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          return (
            <div
              key={i}
              title={status ? `${new Date(cell.ts).toDateString()} — ${ATTENDANCE_STATUSES[status]?.label ?? status}` : new Date(cell.ts).toDateString()}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-[12px] transition-colors",
                cell.inMonth ? "border-slate-100 bg-white" : "border-transparent bg-slate-50/50 text-slate-300",
                status === "present" && "border-emerald-200 bg-emerald-50 text-emerald-700 font-bold",
                status === "absent" && "border-rose-200 bg-rose-50 text-rose-700 font-bold",
                status === "leave" && "border-amber-200 bg-amber-50 text-amber-700 font-bold",
                status === "holiday" && "border-slate-200 bg-slate-100 text-slate-400",
                status === "pending" && "border-yellow-200 bg-yellow-50 text-yellow-700 font-bold",
                isToday && "ring-2 ring-indigo-400 ring-offset-1",
              )}
            >
              {cell.day}
              {status === "present" && <span className="mt-0.5 size-1.5 rounded-full bg-emerald-500" />}
              {status === "absent" && <span className="mt-0.5 size-1.5 rounded-full bg-rose-500" />}
              {status === "pending" && <span className="mt-0.5 size-1.5 rounded-full bg-yellow-500" />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Status colors match the reporting heatmap on your dashboard.</span>
        <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-medium text-slate-500">
          {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Badge>
      </div>
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

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import {
  ENROLLMENT_TYPE_LABELS,
  MODE_LABELS,
  formatDate,
} from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  Flame,
  GraduationCap,
  Loader2,
  MapPin,
  Rocket,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CompanyLogo, EmptyState, Heatmap, PageHeader, StatusBadge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentTracker() {
  const enrollments = useQuery(api.enrollments.myEnrollments);
  const applications = useQuery(api.applications.myApplications);
  const attendance = useQuery(api.attendance.myAttendance);
  const activate = useMutation(api.enrollments.activate);
  const complete = useMutation(api.enrollments.completeEnrollment);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [applicationId, setApplicationId] = useState<string>("manual");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mentor, setMentor] = useState("");
  const [mode, setMode] = useState("remote");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("offcampus");
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (enrollments === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-200" />;
  }

  const active = enrollments.find((e) => e.enrollment.status === "active");
  const completed = enrollments.filter((e) => e.enrollment.status === "completed");
  const selectable = applications?.filter((a) => ["selected", "joined"].includes(a.application.status)) ?? [];

  const handleActivate = async () => {
    setBusy(true);
    try {
      await activate({
        applicationId: applicationId !== "manual" ? (applicationId as never) : undefined,
        companyName: applicationId === "manual" ? companyName : undefined,
        role: applicationId === "manual" ? role : undefined,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        mentor: mentor || undefined,
        mode: mode as never,
        location: location || undefined,
        type: type as never,
      });
      toast.success("Tracker activated 🚀", {
        description: "Your internship is now being tracked. Submit your first attendance entry.",
      });
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate");
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (id: string) => {
    setCompleting(true);
    try {
      await complete({ enrollmentId: id as never });
      toast.success("Internship marked completed 🎉", {
        description: "+500 points added to your rewards.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete");
    } finally {
      setCompleting(false);
    }
  };

  const heatmap = new Map<number, string>();
  attendance?.forEach((a) => heatmap.set(a.date, a.status));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Internship Tracker"
        title="My internship"
        subtitle="Activate a tracker for your internship to log attendance, daily reports, and build your streak."
      />

      {!active ? (
        <div className="space-y-6">
          <EmptyState
            icon={Rocket}
            title="No active internship tracker"
            message="Activate a tracker once you've been selected or joined an internship — on-campus, off-campus, college-provided or self-found."
            action={
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Rocket className="size-4" /> Activate tracker
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Activate internship tracker</DialogTitle>
                    <DialogDescription>
                      Start tracking attendance, daily reports and weekly summaries for your internship.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    {selectable.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-medium text-slate-700">Link to an accepted application</Label>
                        <Select value={applicationId} onValueChange={setApplicationId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual entry (self-found / college-provided)</SelectItem>
                            {selectable.map(({ application, internship, company }) => (
                              <SelectItem key={application._id} value={application._id as string}>
                                {internship?.title} · {company?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {applicationId === "manual" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Company">
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. TechFlow" />
                          </Field>
                          <Field label="Role">
                            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineering Intern" />
                          </Field>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Start date">
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                          </Field>
                          <Field label="End date">
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                          </Field>
                        </div>
                      </>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Mentor">
                        <Input value={mentor} onChange={(e) => setMentor(e.target.value)} placeholder="Mentor name" />
                      </Field>
                      <Field label="Internship mode">
                        <Select value={mode} onValueChange={setMode}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(MODE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Location">
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or Remote" />
                      </Field>
                      <Field label="Internship type">
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ENROLLMENT_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleActivate} disabled={busy || (applicationId === "manual" && (!companyName || !role))}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                      Activate tracker
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          />

          {completed.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed internships</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map(({ enrollment }) => (
                  <Card key={enrollment._id} className="card-elevated rounded-xl border-slate-200/80 p-4">
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={enrollment.companyName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{enrollment.role}</p>
                        <p className="truncate text-xs text-slate-500">{enrollment.companyName}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDate(enrollment.startDate)} → {formatDate(enrollment.endDate)}</span>
                      <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        ✓ Completed
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview card */}
          <Card className="card-elevated overflow-hidden rounded-2xl border-slate-200/80">
            <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-sky-400 to-emerald-400" />
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <CompanyLogo name={active.enrollment.companyName} size="lg" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{active.enrollment.role}</h2>
                      <StatusBadge label="Active" className="border-emerald-200 bg-emerald-50 text-emerald-700" dotClass="bg-emerald-500" />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{active.enrollment.companyName}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-slate-400" /> {formatDate(active.enrollment.startDate)} → {formatDate(active.enrollment.endDate)}</span>
                      <span className="flex items-center gap-1.5"><User className="size-3.5 text-slate-400" /> Mentor: {active.enrollment.mentor}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-slate-400" /> {active.enrollment.location} · {MODE_LABELS[active.enrollment.mode]}</span>
                      <span className="flex items-center gap-1.5"><GraduationCap className="size-3.5 text-slate-400" /> {ENROLLMENT_TYPE_LABELS[active.enrollment.type]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline" className="border-slate-200 bg-white">
                    <Link to="/app/attendance"><CalendarCheck2 className="size-4" /> Attendance</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-slate-200 bg-white">
                    <Link to="/app/reports"><ClipboardList className="size-4" /> Reports</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => handleComplete(active.enrollment._id as string)}
                    disabled={completing}
                  >
                    <Award className="size-4" /> Mark completed
                  </Button>
                </div>
              </div>

              {/* progress */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-600">Internship progress</span>
                  <span className="font-bold text-indigo-600">
                    {Math.min(100, Math.round(((Date.now() - active.enrollment.startDate) / (active.enrollment.endDate - active.enrollment.startDate)) * 100))}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-400 transition-all"
                    style={{ width: `${Math.min(100, Math.round(((Date.now() - active.enrollment.startDate) / (active.enrollment.endDate - active.enrollment.startDate)) * 100))}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>Started {formatDate(active.enrollment.startDate)}</span>
                  <span>Ends {formatDate(active.enrollment.endDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* stats + heatmap */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="card-elevated rounded-xl border-slate-200/80">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CalendarCheck2 className="size-4 text-indigo-600" /> This internship
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Metric label="Days present" value={active.presentCount} />
                <Metric label="Attendance entries" value={active.attendanceCount} />
                <Metric label="Daily reports" value={active.reportCount} />
                <Metric label="Pending review" value={active.pendingReportCount} />
              </CardContent>
            </Card>

            <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
                  <span className="flex items-center gap-2"><Flame className="size-4 text-orange-500" /> Attendance heatmap</span>
                  <Link to="/app/attendance" className="text-xs font-semibold text-indigo-600">Details →</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Heatmap values={heatmap} today={Date.now()} />
                <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-emerald-500" /> Present</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-yellow-400" /> Pending</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-rose-500" /> Absent</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-amber-400" /> Leave</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn("rounded-lg border border-slate-100 bg-slate-50/60 p-3")}>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
    </div>
  );
}

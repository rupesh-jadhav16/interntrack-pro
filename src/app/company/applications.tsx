import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { APPLICATION_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

const COMPANY_ACTIONS: Array<{ status: string; label: string; className: string }> = [
  { status: "under_review", label: "Move to review", className: "border-slate-200 bg-white" },
  { status: "shortlisted", label: "Shortlist", className: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" },
  { status: "interview", label: "Schedule interview", className: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
  { status: "selected", label: "Select", className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
];

export default function CompanyApplications() {
  const applications = useQuery(api.applications.listForCompany);
  const updateStatus = useMutation(api.applications.updateStatus);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const shown = (applications ?? []).filter((a) => filter === "all" || a.application.status === filter);

  const handle = async (id: string, status: string) => {
    setBusy(id);
    try {
      await updateStatus({ applicationId: id as never, status: status as never });
      toast.success("Application updated — student notified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="Applicant pipeline"
        subtitle="Shortlist, schedule interviews, select or reject — students are notified at every step."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-44 bg-white text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(APPLICATION_STATUSES).map(([value, s]) => (
                <SelectItem key={value} value={value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {applications === undefined ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Card key={i} className="h-24 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={FileText} title="No applications here" message="Applications from students will appear in this pipeline." />
      ) : (
        <div className="space-y-3">
          {shown.map(({ application, internship, student }) => (
            <Card key={application._id} className="card-elevated rounded-xl border-slate-200/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
                    {student?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{student?.name}</p>
                    <p className="text-[12px] text-slate-500">
                      {student?.department} · Year {student?.year} · CGPA {student?.cgpa} · {student?.city}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {internship?.title} · Applied {formatDate(application.appliedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <StatusBadge
                    label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                    className={APPLICATION_STATUSES[application.status]?.color}
                    dotClass={APPLICATION_STATUSES[application.status]?.dot}
                  />
                  {application.status === "applied" && (
                    <Button size="sm" className="bg-indigo-600" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "under_review")}>
                      Start review
                    </Button>
                  )}
                  {application.status === "under_review" && (
                    <>
                      <Button size="sm" className="bg-violet-600" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "shortlisted")}>
                        Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "rejected")}>
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {application.status === "shortlisted" && (
                    <Button size="sm" className="bg-indigo-600" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "interview")}>
                      Schedule interview
                    </Button>
                  )}
                  {application.status === "interview" && (
                    <Button size="sm" className="bg-emerald-600" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "selected")}>
                      <CheckCircle2 className="size-3.5" /> Select candidate
                    </Button>
                  )}
                  {!["applied", "under_review", "shortlisted", "interview"].includes(application.status) && (
                    <Button size="sm" variant="outline" className="border-slate-200 bg-white" disabled={busy === application._id as string} onClick={() => handle(application._id as string, "applied")}>
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              {student && student.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                  {student.skills.slice(0, 5).map((s) => (
                    <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{s}</span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

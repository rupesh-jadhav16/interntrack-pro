import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import {
  APPLICATION_STATUSES,
  APPLICATION_STEPS,
  MODE_LABELS,
  daysUntil,
  formatDate,
} from "@/lib/constants";
import { useQuery } from "convex/react";
import { Briefcase, FileText, MapPin } from "lucide-react";
import { CompanyLogo, EmptyState, PageHeader, ProgressSteps, StatusBadge, VerifiedBadge } from "../components/ui";

export default function StudentApplications() {
  const applications = useQuery(api.applications.myApplications);

  const counts = (applications ?? []).reduce<Record<string, number>>((acc, { application }) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="My applications"
        subtitle="Track every application from Applied to Completed. Status changes notify you instantly."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: applications?.length ?? 0, color: "text-slate-900" },
          { label: "Active", value: (counts.applied ?? 0) + (counts.under_review ?? 0) + (counts.shortlisted ?? 0), color: "text-sky-600" },
          { label: "Interview", value: counts.interview ?? 0, color: "text-indigo-600" },
          { label: "Selected", value: (counts.selected ?? 0) + (counts.joined ?? 0), color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="card-elevated rounded-xl border-slate-200/80 p-4">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {applications === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-36 animate-pulse rounded-xl border-slate-200/80" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          message="Explore internships and apply in one click — your pipeline will appear here."
        />
      ) : (
        <div className="space-y-4">
          {applications.map(({ application, internship, company }) => (
            <Card key={application._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  <CompanyLogo name={company?.name ?? "?"} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-slate-900">{internship?.title}</p>
                      {company?.verificationStatus === "verified" && <VerifiedBadge compact />}
                    </div>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      {company?.name} · {internship?.city} · {MODE_LABELS[internship?.mode ?? ""] ?? "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-400">
                      <span>Applied {formatDate(application.appliedAt)}</span>
                      {internship && <span>Deadline: {formatDate(internship.deadline)} ({daysUntil(internship.deadline)})</span>}
                      {internship && <span className="flex items-center gap-1"><MapPin className="size-3" /> {internship.city}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                  <StatusBadge
                    label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                    className={APPLICATION_STATUSES[application.status]?.color}
                    dotClass={APPLICATION_STATUSES[application.status]?.dot}
                  />
                  <Badge variant="outline" className="rounded-full border-slate-200 text-[11px] font-medium text-slate-500">
                    {application.progress}% complete
                  </Badge>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                {application.status === "rejected" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700">
                    <Briefcase className="size-4" />
                    This application was not successful. An acknowledgement letter was generated in your profile.
                  </div>
                ) : (
                  <ProgressSteps steps={[...APPLICATION_STEPS]} current={application.status} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

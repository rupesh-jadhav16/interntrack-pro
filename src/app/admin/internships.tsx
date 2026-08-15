import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { MODE_LABELS, TYPE_LABELS, daysUntil, formatDate } from "@/lib/constants";
import { useQuery } from "convex/react";
import { Briefcase, MapPin } from "lucide-react";
import { CompanyLogo, EmptyState, PageHeader, VerifiedBadge } from "../components/ui";

export default function AdminInternships() {
  const internships = useQuery(api.internships.listAdmin);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Internships"
        title="Internship ecosystem"
        subtitle="Every internship posted by verified and pending companies across the platform."
      />

      {internships === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Card key={i} className="h-40 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : internships.length === 0 ? (
        <EmptyState icon={Briefcase} title="No internships posted" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {internships.map(({ internship, company }) => (
            <Card key={internship._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo name={company?.name ?? "?"} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{internship.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      {company?.name}
                      {company?.verificationStatus === "verified" && <VerifiedBadge compact />}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-full text-[10px] font-semibold ${internship.status === "open" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                >
                  {internship.status === "open" ? "Open" : "Closed"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {internship.city}</span>
                <span>{MODE_LABELS[internship.mode]}</span>
                <span>{TYPE_LABELS[internship.type]}</span>
                <span className="font-semibold text-emerald-600">{internship.stipend}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {internship.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{s}</span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span>Posted {formatDate(internship.postedAt)}</span>
                <span className="font-semibold text-slate-600">Deadline: {daysUntil(internship.deadline)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

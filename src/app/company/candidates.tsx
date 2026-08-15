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
import { APPLICATION_STATUSES, formatDate } from "@/lib/constants";
import { useQuery } from "convex/react";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function CompanyCandidates() {
  const applications = useQuery(api.applications.listForCompany);
  const [selected, setSelected] = useState<string | null>(null);

  type Candidate = {
    student: NonNullable<NonNullable<typeof applications>[number]["student"]>;
    apps: Array<{ application: { _id: unknown; status: string; appliedAt: number }; internship: { title: string } | null }>;
  };

  const byStudent = new Map<string, Candidate>();
  (applications ?? []).forEach(({ application, internship, student }) => {
    if (!student) return;
    const key = student._id as string;
    if (!byStudent.has(key)) {
      byStudent.set(key, { student, apps: [] });
    }
    byStudent.get(key)!.apps.push({ application, internship });
  });

  const candidates = [...byStudent.values()].sort(
    (a, b) => b.apps.length - a.apps.length,
  );

  const selectedApps = (applications ?? []).filter((a) => a.student?._id === selected);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Candidates"
        title="Candidate directory"
        subtitle="Every student who has applied to your company, grouped with their application history."
      />

      {applications === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Card key={i} className="h-36 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : candidates.length === 0 ? (
        <EmptyState icon={Users} title="No candidates yet" message="Students who apply to your internships will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map(({ student, apps }) => (
            <Card
              key={student._id}
              className="card-elevated cursor-pointer rounded-xl border-slate-200/80 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"
              onClick={() => setSelected(student._id as string)}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
                  {student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {student.department} · Year {student.year} · CGPA {student.cgpa}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {student.skills.slice(0, 4).map((s) => (
                  <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{s}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex gap-1.5">
                  {apps.map(({ application }) => (
                    <StatusBadge
                      key={String(application._id)}
                      label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                      className={`px-1.5 text-[9px] ${APPLICATION_STATUSES[application.status]?.color}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-indigo-600">View →</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          {selected && selectedApps[0]?.student && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="size-4 text-indigo-600" /> {selectedApps[0].student.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedApps[0].student.department} · Year {selectedApps[0].student.year} · CGPA {selectedApps[0].student.cgpa} · {selectedApps[0].student.city}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApps[0].student.skills.map((s) => (
                      <span key={s} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Applications to your company</p>
                  <div className="space-y-2">
                    {selectedApps.map(({ application, internship }) => (
                      <div key={application._id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-bold text-slate-800">{internship?.title}</p>
                          <p className="text-[11px] text-slate-400">Applied {formatDate(application.appliedAt)}</p>
                        </div>
                        <StatusBadge
                          label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                          className={APPLICATION_STATUSES[application.status]?.color}
                          dotClass={APPLICATION_STATUSES[application.status]?.dot}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {selectedApps[0].student.certifications.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApps[0].student.certifications.map((c) => (
                        <Badge key={c} variant="outline" className="rounded-md border-slate-200 text-[10px] font-medium text-slate-500">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="w-full">
                  <a href="/app/applications">Manage this candidate's pipeline →</a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

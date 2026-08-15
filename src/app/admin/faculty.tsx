import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { UserCog } from "lucide-react";
import { EmptyState, PageHeader } from "../components/ui";

export default function AdminFaculty() {
  const faculty = useQuery(api.admin.allFaculty);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Faculty"
        title="Faculty & mentors"
        subtitle="Faculty members and the students assigned to them for report verification and progress monitoring."
      />

      {faculty === undefined ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-24 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : faculty.length === 0 ? (
        <EmptyState icon={UserCog} title="No faculty yet" message="Faculty profiles appear once they complete onboarding." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {faculty.map(({ faculty: f, studentCount }) => (
            <Card key={f._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-xs font-bold text-white">
                  {f.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{f.name}</p>
                  <p className="truncate text-xs text-slate-500">{f.designation}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-2 text-[13px]">
                <span className="text-slate-600">{f.department}</span>
                <span className="font-bold text-slate-900">{studentCount} students</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

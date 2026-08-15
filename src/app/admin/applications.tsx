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
import { FileText } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";

const ALL_STATUSES = Object.keys(APPLICATION_STATUSES);

export default function AdminApplications() {
  const applications = useQuery(api.applications.listAll);
  const updateStatus = useMutation(api.applications.updateStatus);
  const [filter, setFilter] = useState("all");

  const shown = (applications ?? []).filter((a) => filter === "all" || a.application.status === filter);

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateStatus({ applicationId: id as never, status: status as never });
      toast.success("Application updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="All applications"
        subtitle="College-wide visibility into every internship application, with the ability to correct statuses."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-9 w-44 bg-white text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{APPLICATION_STATUSES[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {applications === undefined ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Card key={i} className="h-16 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={FileText} title="No applications" message="Applications from every student appear here." />
      ) : (
        <div className="space-y-2.5">
          {shown.map(({ application, internship, student, company }) => (
            <Card key={application._id} className="card-elevated rounded-xl border-slate-200/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {student?.name} → {internship?.title}
                  </p>
                  <p className="text-[12px] text-slate-500">
                    {company?.name} · Applied {formatDate(application.appliedAt)}
                    {internship ? ` · Deadline ${formatDate(internship.deadline)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge
                    label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                    className={APPLICATION_STATUSES[application.status]?.color}
                    dotClass={APPLICATION_STATUSES[application.status]?.dot}
                  />
                  <Select value={application.status} onValueChange={(v) => handleStatus(application._id as string, v)}>
                    <SelectTrigger className="h-8 w-40 bg-white text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{APPLICATION_STATUSES[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

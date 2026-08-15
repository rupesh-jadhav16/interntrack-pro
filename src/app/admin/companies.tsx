import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { VERIFICATION_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { CompanyLogo, EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function AdminCompanies() {
  const [all, setAll] = useState(false);
  const companies = useQuery(api.companies.allCompanies);
  const verify = useMutation(api.admin.verifyCompany);
  const [busy, setBusy] = useState<string | null>(null);

  const shown = (companies ?? []).filter((c) => all || c.verificationStatus !== "verified");
  const pendingCount = (companies ?? []).filter((c) => c.verificationStatus === "pending").length;

  const handleVerify = async (id: string, status: "verified" | "rejected" | "suspended") => {
    setBusy(id);
    try {
      await verify({ companyId: id as never, status });
      toast.success(status === "verified" ? "Company verified ✓" : `Company marked ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Companies"
        title="Company registry"
        subtitle={`${pendingCount} companies awaiting verification. Verified companies get the ✓ badge on all their internships.`}
        actions={
          <Button variant="outline" className="border-slate-200 bg-white" onClick={() => setAll((a) => !a)}>
            {all ? "Show pending only" : "Show all companies"}
          </Button>
        }
      />

      {companies === undefined ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Card key={i} className="h-28 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={Building2} title="No companies" message="New company registrations will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((company) => (
            <Card key={company._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo name={company.name} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{company.name}</p>
                      {company.verificationStatus === "verified" && (
                        <ShieldCheck className="size-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{company.industry} · {company.city}</p>
                  </div>
                </div>
                <StatusBadge
                  label={VERIFICATION_STATUSES[company.verificationStatus]?.label ?? company.verificationStatus}
                  className={VERIFICATION_STATUSES[company.verificationStatus]?.color}
                  dotClass={
                    company.verificationStatus === "verified"
                      ? "bg-emerald-500"
                      : company.verificationStatus === "pending"
                        ? "bg-amber-500"
                        : company.verificationStatus === "rejected"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-slate-50/70 p-3.5 text-[12px] text-slate-600">
                <p><span className="text-slate-400">Website:</span> {company.website}</p>
                <p><span className="text-slate-400">Email:</span> {company.email}</p>
                <p><span className="text-slate-400">Registration:</span> {company.registrationInfo}</p>
                <p><span className="text-slate-400">Recruiter:</span> {company.recruiterName}</p>
                <p className="col-span-2"><span className="text-slate-400">Address:</span> {company.address}</p>
                <p className="col-span-2"><span className="text-slate-400">Submitted:</span> {formatDate(company.submittedAt)}</p>
              </div>

              <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-slate-500">{company.description}</p>

              {company.verificationStatus === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === company._id as string} onClick={() => handleVerify(company._id as string, "verified")}>
                    {busy === company._id as string ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />} Verify company
                  </Button>
                  <Button size="sm" variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={busy === company._id as string} onClick={() => handleVerify(company._id as string, "rejected")}>
                    Reject
                  </Button>
                </div>
              )}
              {company.verificationStatus === "verified" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={() => handleVerify(company._id as string, "suspended")}>
                    Suspend
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-200 bg-white" onClick={() => handleVerify(company._id as string, "rejected")}>
                    Revoke verification
                  </Button>
                </div>
              )}
              <Badge variant="outline" className="mt-3 rounded-full border-slate-200 text-[10px] font-medium text-slate-400">
                {company.userId ? "Registered by a company account" : "Demo listing"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

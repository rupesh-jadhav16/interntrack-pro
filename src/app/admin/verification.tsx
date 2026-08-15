import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { VERIFICATION_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { CompanyLogo, EmptyState, PageHeader, StatusBadge } from "../components/ui";

export default function AdminVerification() {
  const companies = useQuery(api.companies.allCompanies) ?? [];
  const verify = useMutation(api.admin.verifyCompany);
  const [busy, setBusy] = useState<string | null>(null);

  const pending = companies.filter((c) => c.verificationStatus === "pending");

  const handleVerify = async (id: string, status: "verified" | "rejected") => {
    setBusy(id);
    try {
      await verify({ companyId: id as never, status });
      toast.success(status === "verified" ? "Company verified ✓" : "Company rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Verification Queue"
        title="Company verification"
        subtitle="Review company registrations. Verified companies earn the ✓ Verified badge students filter by."
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Queue is clear 🎉"
          message="No companies are waiting for verification right now."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((company) => (
            <Card key={company._id} className="card-elevated rounded-xl border-amber-200/70 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3.5">
                  <CompanyLogo name={company.name} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.industry} · {company.city}</p>
                    <div className="mt-2 grid gap-x-5 gap-y-0.5 text-[12px] text-slate-600 sm:grid-cols-2">
                      <p><span className="text-slate-400">Website:</span> {company.website}</p>
                      <p><span className="text-slate-400">Official email:</span> {company.email}</p>
                      <p><span className="text-slate-400">Registration:</span> {company.registrationInfo}</p>
                      <p><span className="text-slate-400">Recruiter:</span> {company.recruiterName} ({company.recruiterEmail})</p>
                      <p><span className="text-slate-400">Address:</span> {company.address}</p>
                      <p><span className="text-slate-400">Submitted:</span> {formatDate(company.submittedAt)}</p>
                    </div>
                  </div>
                </div>
                <StatusBadge
                  label={VERIFICATION_STATUSES.pending?.label ?? "Pending"}
                  className={VERIFICATION_STATUSES.pending?.color}
                  dotClass="bg-amber-500"
                />
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-[13px] leading-6 text-slate-600">{company.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === company._id as string} onClick={() => handleVerify(company._id as string, "verified")}>
                  {busy === company._id as string ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Approve & verify
                </Button>
                <Button variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" disabled={busy === company._id as string} onClick={() => handleVerify(company._id as string, "rejected")}>
                  <XCircle className="size-4" /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

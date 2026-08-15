import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { VERIFICATION_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Building2, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { CompanyLogo, PageHeader, StatusBadge, VerifiedBadge } from "../components/ui";

export default function CompanyProfile() {
  const company = useQuery(api.profiles.myCompanyProfile);
  const update = useMutation(api.profiles.updateCompanyProfile);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (!company) {
    return <div className="h-96 animate-pulse rounded-2xl border border-slate-200" />;
  }

  const dirty = name || website || industry || city || address || description || recruiterName || recruiterEmail;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update({
        name: name || undefined,
        website: website || undefined,
        industry: industry || undefined,
        city: city || undefined,
        address: address || undefined,
        description: description || undefined,
        recruiterName: recruiterName || undefined,
        recruiterEmail: recruiterEmail || undefined,
      });
      toast.success("Company profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company Profile"
        title="Company profile"
        subtitle="Details here are visible to students when they browse your internships."
      />

      <Card className="card-elevated rounded-xl border-slate-200/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CompanyLogo name={company.name} size="lg" />
            <div>
              <p className="text-lg font-bold text-slate-900">{company.name}</p>
              <p className="text-[13px] text-slate-500">{company.email} · {company.website}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            {company.verificationStatus === "verified" ? (
              <VerifiedBadge />
            ) : (
              <StatusBadge
                label={VERIFICATION_STATUSES[company.verificationStatus]?.label ?? company.verificationStatus}
                className={VERIFICATION_STATUSES[company.verificationStatus]?.color}
                dotClass={company.verificationStatus === "pending" ? "bg-amber-500" : company.verificationStatus === "rejected" ? "bg-rose-500" : "bg-slate-400"}
              />
            )}
            <p className="text-[11px] text-slate-400">
              Registered {formatDate(company.submittedAt)}
              {company.verifiedAt ? ` · Verified ${formatDate(company.verifiedAt)}` : ""}
            </p>
          </div>
        </div>
      </Card>

      <Card className="card-elevated rounded-xl border-slate-200/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Building2 className="size-4 text-indigo-600" /> Edit details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name">
                <Input defaultValue={company.name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Website">
                <Input defaultValue={company.website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
              <Field label="Industry">
                <Input defaultValue={company.industry} onChange={(e) => setIndustry(e.target.value)} />
              </Field>
              <Field label="City">
                <Input defaultValue={company.city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="Address">
                <Input defaultValue={company.address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Recruiter">
                  <Input defaultValue={company.recruiterName} onChange={(e) => setRecruiterName(e.target.value)} />
                </Field>
                <Field label="Recruiter email">
                  <Input defaultValue={company.recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Description">
              <Textarea defaultValue={company.description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </Field>
            <Button type="submit" disabled={busy || !dirty}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
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

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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { CERT_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentCertificates() {
  const certificates = useQuery(api.certificates.myCertificates);
  const submit = useMutation(api.certificates.submit);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState("offer");
  const [companyName, setCompanyName] = useState("");
  const [fileName, setFileName] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submit({
        type: type as never,
        companyName,
        fileName: fileName || undefined,
        details,
      });
      toast.success(
        res.status === "verified"
          ? "Certificate verified ✓"
          : res.status === "suspicious"
            ? "Flagged for T&P review"
            : "Certificate under review",
        {
          description: `Authenticity score: ${res.score}/100`,
        },
      );
      setOpen(false);
      setCompanyName(""); setFileName(""); setDetails("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Certificates"
        title="Certificate verification"
        subtitle="Upload offer letters and certificates for AI-assisted authenticity scoring. Suspicious documents go to the T&P Cell review queue."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="size-4" /> Upload certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle>Submit a document for verification</DialogTitle>
                <DialogDescription>
                  Offer letters, completion and experience certificates. The
                  system cross-checks the company registry and flags suspicious
                  indicators. Files are never shared publicly.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Document type">
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offer">Offer letter</SelectItem>
                        <SelectItem value="completion">Completion certificate</SelectItem>
                        <SelectItem value="experience">Experience certificate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Company name">
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="TechFlow Systems" required />
                  </Field>
                </div>
                <Field label="Document file name">
                  <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="TechFlow_Offer_Letter.pdf" />
                </Field>
                <Field label="Details / issuer notes">
                  <Textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="Issued by, date, signatory, any reference numbers…"
                    required
                  />
                </Field>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
                    Analyze & submit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[13px] leading-6 text-indigo-800">
        <strong>Honest by design:</strong> the authenticity score is AI-assisted —
        it cannot guarantee a document is genuine. Documents scoring low, or
        flagged for review, are always checked manually by the T&P Cell.
      </div>

      {certificates === undefined ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse rounded-xl border-slate-200/80" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No documents yet"
          message="Upload your offer letter or certificate to get an authenticity score."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((c) => {
            const meta = CERT_STATUSES[c.verificationStatus];
            return (
              <Card key={c._id} className="card-elevated rounded-xl border-slate-200/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        c.verificationStatus === "verified"
                          ? "bg-emerald-50 text-emerald-600"
                          : c.verificationStatus === "suspicious"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {c.verificationStatus === "verified" ? (
                        <CheckCircle2 className="size-5" />
                      ) : c.verificationStatus === "suspicious" ? (
                        <AlertTriangle className="size-5" />
                      ) : (
                        <FileSearch className="size-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.fileName ?? "Document"}</p>
                      <p className="text-xs text-slate-500">{c.companyName} · {c.type} · {formatDate(c.uploadedAt)}</p>
                    </div>
                  </div>
                  <StatusBadge label={`${meta.emoji} ${meta.label}`} className={meta.color} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authenticity score</p>
                      <span className="text-base font-extrabold text-slate-900">{c.authenticityScore}<span className="text-[10px] text-slate-400">/100</span></span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          c.authenticityScore >= 80 ? "bg-emerald-500" : c.authenticityScore >= 55 ? "bg-amber-400" : "bg-rose-500",
                        )}
                        style={{ width: `${c.authenticityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{c.verificationStatus === "verified" ? "Verified" : c.verificationStatus === "suspicious" ? "Under T&P review" : "Requires review"}</p>
                    <p className="text-[11px] text-slate-400">{c.adminReviewed ? "Reviewed by T&P Cell" : "Awaiting T&P review"}</p>
                  </div>
                </div>

                {c.suspiciousIndicators.length > 0 && (
                  <div className="mt-3 rounded-lg bg-rose-50/70 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Suspicious indicators</p>
                    <ul className="mt-1 space-y-0.5">
                      {c.suspiciousIndicators.map((s) => (
                        <li key={s} className="flex items-start gap-1.5 text-[12px] text-rose-700">
                          <span className="mt-1 size-1 shrink-0 rounded-full bg-rose-400" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12px] leading-5 text-slate-600">
                  {c.details}
                </div>

                <Badge variant="outline" className="mt-3 rounded-full border-slate-200 text-[10px] font-medium text-slate-400">
                  🔒 Stored privately — visible only to you and the T&P Cell
                </Badge>
              </Card>
            );
          })}
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

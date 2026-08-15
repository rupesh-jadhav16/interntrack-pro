import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { CERT_STATUSES, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, FileSearch, Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function AdminCertificates() {
  const [queueOnly, setQueueOnly] = useState(true);
  const certificates = useQuery(api.certificates.allCertificates, { queueOnly: queueOnly || undefined });
  const review = useMutation(api.certificates.reviewCertificate);
  const [busy, setBusy] = useState<string | null>(null);

  const queueCount = (certificates ?? []).filter(
    (c) => c.certificate.verificationStatus !== "verified",
  ).length;

  const handleReview = async (id: string, action: "approve" | "flag") => {
    setBusy(id);
    try {
      await review({ certificateId: id as never, action });
      toast.success(action === "approve" ? "Certificate verified" : "Certificate flagged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Certificates"
        title="Certificate verification"
        subtitle="AI-assisted scores flag suspicious documents. Your manual review is the final word — this queue is where authenticity gets decided."
        actions={
          <Button
            variant="outline"
            className="border-slate-200 bg-white"
            onClick={() => setQueueOnly((q) => !q)}
          >
            {queueOnly ? `Review queue (${queueCount})` : "Show all documents"}
          </Button>
        }
      />

      {certificates === undefined ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-40 animate-pulse rounded-xl border-slate-200/80" />)}</div>
      ) : certificates.length === 0 ? (
        <EmptyState icon={FileSearch} title="Queue is clear" message="No documents waiting for review." />
      ) : (
        <div className="space-y-4">
          {certificates.map(({ certificate, student }) => {
            const meta = CERT_STATUSES[certificate.verificationStatus];
            const needsReview = certificate.verificationStatus !== "verified";
            return (
              <Card
                key={certificate._id}
                className={cn(
                  "card-elevated rounded-xl border-slate-200/80 p-5",
                  needsReview && certificate.verificationStatus === "suspicious" && "border-rose-200 bg-rose-50/30",
                  needsReview && certificate.verificationStatus === "requires_review" && "border-amber-200 bg-amber-50/30",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{certificate.fileName ?? "Document"}</p>
                      <StatusBadge label={`${meta.emoji} ${meta.label}`} className={meta.color} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {student?.name} · {certificate.companyName} · {certificate.type} · uploaded {formatDate(certificate.uploadedAt)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400">Score</span>
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            certificate.authenticityScore >= 80 ? "bg-emerald-500" : certificate.authenticityScore >= 55 ? "bg-amber-400" : "bg-rose-500",
                          )}
                          style={{ width: `${certificate.authenticityScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">{certificate.authenticityScore}</span>
                    </div>
                  </div>
                </div>

                {certificate.suspiciousIndicators.length > 0 && (
                  <div className="mt-3 rounded-lg bg-rose-50/80 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Suspicious indicators</p>
                    <ul className="mt-1 space-y-0.5">
                      {certificate.suspiciousIndicators.map((s) => (
                        <li key={s} className="flex items-start gap-1.5 text-[12px] text-rose-700">
                          <span className="mt-1 size-1 shrink-0 rounded-full bg-rose-400" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12px] leading-5 text-slate-600">{certificate.details}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={busy === certificate._id as string}
                    onClick={() => handleReview(certificate._id as string, "approve")}
                  >
                    {busy === certificate._id as string ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Approve & verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    disabled={busy === certificate._id as string}
                    onClick={() => handleReview(certificate._id as string, "flag")}
                  >
                    <Flag className="size-3.5" /> Flag as suspicious
                  </Button>
                  {certificate.adminReviewed && (
                    <span className="text-[11px] font-medium text-slate-400">✓ Reviewed by T&P</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

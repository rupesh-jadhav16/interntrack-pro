import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/ui";

const FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: "dailyReportPoints", label: "Daily report", hint: "Per submitted daily report" },
  { key: "weeklyReportPoints", label: "Weekly report", hint: "Per submitted weekly report" },
  { key: "perfectWeekPoints", label: "Perfect week", hint: "5+ present days and 5+ reports in one week" },
  { key: "streak7Points", label: "7-day streak", hint: "Reaching a 7-day streak" },
  { key: "streak30Points", label: "30-day streak", hint: "Reaching a 30-day streak" },
  { key: "completionPoints", label: "Internship completion", hint: "Completing a tracked internship" },
  { key: "verifiedInternshipPoints", label: "Verified internship", hint: "Interning at a verified company" },
  { key: "verifiedCertificatePoints", label: "Verified certificate", hint: "Certificate verified by T&P" },
];

export default function AdminRewards() {
  const config = useQuery(api.rewards.getRewardConfig);
  const update = useMutation(api.rewards.updateRewardConfig);
  const [values, setValues] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const current = values;

  const handleChange = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: Number(value) || 0 }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update({
        dailyReportPoints: current.dailyReportPoints ?? config?.dailyReportPoints ?? 10,
        weeklyReportPoints: current.weeklyReportPoints ?? config?.weeklyReportPoints ?? 50,
        perfectWeekPoints: current.perfectWeekPoints ?? config?.perfectWeekPoints ?? 100,
        streak7Points: current.streak7Points ?? config?.streak7Points ?? 50,
        streak30Points: current.streak30Points ?? config?.streak30Points ?? 200,
        completionPoints: current.completionPoints ?? config?.completionPoints ?? 500,
        verifiedInternshipPoints: current.verifiedInternshipPoints ?? config?.verifiedInternshipPoints ?? 100,
        verifiedCertificatePoints: current.verifiedCertificatePoints ?? config?.verifiedCertificatePoints ?? 100,
      });
      toast.success("Reward configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rewards"
        title="Rewards & points configuration"
        subtitle="Tune how many points each action earns. Changes apply immediately to the live leaderboard."
      />

      <Card className="card-elevated rounded-xl border-slate-200/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Gift className="size-4 text-indigo-600" /> Point values
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map((f) => (
                  <div key={f.key} className="rounded-xl border border-slate-100 p-3.5">
                    <Label className="text-[13px] font-medium text-slate-700">{f.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      className="mt-1.5 h-9 bg-white"
                      defaultValue={config[f.key as keyof typeof config] as number}
                      value={current[f.key] ?? (config[f.key as keyof typeof config] as number)}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                    />
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">{f.hint}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[12px] text-slate-500">
                  Badges like <strong>7 Day Streak</strong>, <strong>Perfect Week</strong> and <strong>Internship Champion</strong> unlock automatically from activity — no extra setup.
                </p>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />} Save config
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

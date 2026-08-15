import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Flame, Gift, Rocket, Target, Trophy } from "lucide-react";
import { PageHeader, RingGauge } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentRewards() {
  const rewards = useQuery(api.rewards.getMyRewards);

  if (!rewards) {
    return <div className="h-96 animate-pulse rounded-2xl border border-slate-200" />;
  }

  const earned = rewards.badges.filter((b) => b.earned);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rewards"
        title="Points, badges & achievements"
        subtitle="Consistency earns points. Points earn badges. Badges earn reputation across your college."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total points</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-indigo-600">{rewards.points}</p>
              <p className="mt-1 text-xs text-slate-400">Rank #{rewards.rank} on the leaderboard</p>
            </div>
            <RingGauge value={Math.min(100, (rewards.points % 1000) / 10)} label="Level" size={84} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center">
            <div>
              <p className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900">
                <Flame className="size-4 text-orange-500" /> {rewards.currentStreak}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Current streak</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{rewards.longestStreak}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Longest streak</p>
            </div>
          </div>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 p-5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Rocket className="size-4 text-indigo-600" /> Next reward
          </CardTitle>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-indigo-800">
              <Target className="size-4" /> {rewards.nextReward.name}
            </p>
            <p className="mt-1 text-[13px] text-indigo-600/80">{rewards.nextReward.description}</p>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">How points work</p>
            {[
              ["Daily report", `+${rewards.config.dailyReportPoints}`],
              ["Weekly report", `+${rewards.config.weeklyReportPoints}`],
              ["Perfect attendance week", `+${rewards.config.perfectWeekPoints}`],
              ["7-day streak", `+${rewards.config.streak7Points}`],
              ["30-day streak", `+${rewards.config.streak30Points}`],
              ["Internship completion", `+${rewards.config.completionPoints}`],
              ["Verified internship", `+${rewards.config.verifiedInternshipPoints}`],
              ["Verified certificate", `+${rewards.config.verifiedCertificatePoints}`],
            ].map(([label, points]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-1.5 text-[12px]">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold text-indigo-600">{points}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 p-5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Trophy className="size-4 text-amber-500" /> Badges
          </CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {rewards.badges.map((badge) => (
              <div
                key={badge.name}
                title={badge.description}
                className={cn(
                  "rounded-xl border p-3 text-center transition-all",
                  badge.earned
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-slate-100 bg-slate-50/50 opacity-60 grayscale",
                )}
              >
                <p className="text-2xl">{badge.emoji}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-800">{badge.name}</p>
                {badge.earned ? (
                  <Badge className="mt-1 rounded-full border-emerald-200 bg-emerald-50 text-[9px] font-semibold text-emerald-700">
                    Earned
                  </Badge>
                ) : (
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">{badge.description}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="card-elevated rounded-xl border-slate-200/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Gift className="size-4 text-indigo-600" /> Achievement milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "First Report", value: rewards.reportsCount >= 1, detail: `${rewards.reportsCount} reports` },
            { label: "14-Day Consistency", value: rewards.reportsCount >= 14, detail: `${rewards.reportsCount}/14` },
            { label: "30 Reports", value: rewards.reportsCount >= 30, detail: `${rewards.reportsCount}/30` },
            { label: "Perfect Week", value: rewards.perfectWeeks >= 1, detail: `${rewards.perfectWeeks} week(s)` },
            { label: "Finisher", value: rewards.completed >= 1, detail: `${rewards.completed} completed` },
          ].map((m) => (
            <div
              key={m.label}
              className={cn(
                "rounded-xl border p-3.5 text-center",
                m.value ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-slate-50/50",
              )}
            >
              <p className="text-[13px] font-bold text-slate-800">{m.label}</p>
              <p className={cn("mt-0.5 text-[11px]", m.value ? "text-emerald-600 font-semibold" : "text-slate-400")}>
                {m.value ? "✓ Achieved" : m.detail}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

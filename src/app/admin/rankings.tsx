import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Crown, Flame, Trophy } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/ui";
import { cn } from "@/lib/utils";

export default function AdminRankings() {
  const [department, setDepartment] = useState("all");
  const rows = useQuery(api.rewards.leaderboard, {
    department: department !== "all" ? department : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rankings"
        title="College-wide leaderboard"
        subtitle="Points are earned through reports, attendance, streaks and completions — transparent and configurable."
        actions={
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 w-48 bg-white text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {["Computer Science", "Electronics", "Information Technology", "Mechanical", "Civil", "Electrical"].map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card className="card-elevated overflow-hidden rounded-xl border-slate-200/80">
        {rows === undefined ? (
          <div className="h-96 animate-pulse bg-slate-100/60" />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.studentId} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex w-10 shrink-0 items-center justify-center">
                  {row.rank === 1 ? (
                    <Crown className="size-5 text-amber-500" />
                  ) : row.rank === 2 ? (
                    <span className="text-base font-extrabold text-slate-300">#2</span>
                  ) : row.rank === 3 ? (
                    <span className="text-base font-extrabold text-orange-300">#3</span>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{row.rank}</span>
                  )}
                </div>
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-[11px] font-bold text-white">
                  {row.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{row.student.name}</p>
                  <p className="text-[11px] text-slate-400">{row.student.department} · Year {row.student.year}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 text-[10px] font-semibold text-orange-600">
                    <Flame className="size-3" /> {row.stats.longestStreak}d
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-semibold text-slate-500">
                    {row.stats.attendancePct}% attendance
                  </Badge>
                  {row.stats.enrollmentActive && (
                    <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                      Interning
                    </Badge>
                  )}
                </div>
                <p className="w-20 text-right text-lg font-extrabold text-indigo-600">{row.stats.points}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <Trophy className="size-4 text-amber-500" />
        Rankings exclude private data (CGPA, contact details) by design — only demonstrated internship activity counts.
      </div>
    </div>
  );
}

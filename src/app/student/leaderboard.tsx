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
import { Crown, Flame, Medal, TrendingUp } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentLeaderboard() {
  const [department, setDepartment] = useState("all");
  const [year, setYear] = useState("all");

  const rows = useQuery(api.rewards.leaderboard, {
    department: department !== "all" ? department : undefined,
    year: year !== "all" ? Number(year) : undefined,
  });

  const rankStyle = (rank: number) =>
    rank === 1
      ? "bg-amber-50 border-amber-200"
      : rank === 2
        ? "bg-slate-50 border-slate-200"
        : rank === 3
          ? "bg-orange-50 border-orange-200"
          : "border-slate-100";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="College Rankings"
        title="Internship leaderboard"
        subtitle="Points are earned through daily reports, attendance, streaks and internship completions. No sensitive data is used for ranking."
        actions={
          <div className="flex gap-2">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-9 w-44 bg-white text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {["Computer Science", "Electronics", "Information Technology", "Mechanical", "Civil", "Electrical"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-32 bg-white text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {["1", "2", "3", "4"].map((y) => (
                  <SelectItem key={y} value={y}>Year {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Card className="card-elevated overflow-hidden rounded-xl border-slate-200/80">
        {rows === undefined ? (
          <div className="h-96 animate-pulse bg-slate-100/60" />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div
                key={row.studentId}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 sm:px-6",
                  rankStyle(row.rank),
                )}
              >
                <div className="flex w-10 shrink-0 items-center justify-center">
                  {row.rank === 1 ? (
                    <Crown className="size-5 text-amber-500" />
                  ) : row.rank === 2 ? (
                    <Medal className="size-5 text-slate-400" />
                  ) : row.rank === 3 ? (
                    <Medal className="size-5 text-orange-400" />
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{row.rank}</span>
                  )}
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
                  {row.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{row.student.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {row.student.department} · Year {row.student.year} · {row.student.city}
                    {row.stats.enrollmentActive && (
                      <Badge className="ml-2 rounded-full border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-semibold text-emerald-700">
                        Interning
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1 text-[13px] font-semibold text-slate-700">
                      <Flame className="size-3.5 text-orange-500" /> {row.stats.currentStreak}d
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Streak</p>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-[13px] font-semibold text-slate-700">{row.stats.attendancePct}%</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Attendance</p>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <p className="text-base font-extrabold text-indigo-600">{row.stats.points}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <TrendingUp className="size-4 text-indigo-500" />
        Rankings refresh live as reports and attendance are submitted. Points are based purely on demonstrated consistency and completion.
      </div>
    </div>
  );
}

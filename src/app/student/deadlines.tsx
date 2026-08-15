import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { daysUntil, formatDate, formatDateShort } from "@/lib/constants";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import {
  AlarmClock,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { PageHeader } from "../components/ui";

const TYPE_META: Record<string, { icon: typeof Clock; color: string }> = {
  application: { icon: Briefcase, color: "bg-indigo-50 text-indigo-600" },
  interview: { icon: CalendarCheck2, color: "bg-sky-50 text-sky-600" },
  daily_report: { icon: FileText, color: "bg-amber-50 text-amber-600" },
  weekly_report: { icon: FileText, color: "bg-violet-50 text-violet-600" },
  completion: { icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600" },
  certificate: { icon: ShieldCheck, color: "bg-rose-50 text-rose-600" },
};

export default function StudentDeadlines() {
  const deadlines = useQuery(api.deadlines.myDeadlines);

  const groups = {
    due_today: deadlines?.filter((d) => d.status === "due_today") ?? [],
    upcoming: deadlines?.filter((d) => d.status === "upcoming") ?? [],
    overdue: deadlines?.filter((d) => d.status === "overdue") ?? [],
    completed: deadlines?.filter((d) => d.status === "completed") ?? [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Deadlines"
        title="Deadline management"
        subtitle="Application deadlines, daily report cut-offs, interview dates and internship completion — all in one place."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Due today" value={groups.due_today.length} color="text-amber-600" />
        <Summary label="Upcoming" value={groups.upcoming.length} color="text-indigo-600" />
        <Summary label="Overdue" value={groups.overdue.length} color="text-rose-600" />
        <Summary label="Completed" value={groups.completed.length} color="text-emerald-600" />
      </div>

      <DeadlineGroup title="Due today" accent="border-amber-300 bg-amber-50/60" items={groups.due_today} />
      <DeadlineGroup title="Upcoming" accent="border-indigo-100 bg-white" items={groups.upcoming} />
      <DeadlineGroup title="Overdue" accent="border-rose-200 bg-rose-50/40" items={groups.overdue} />
      <DeadlineGroup title="Completed" accent="border-slate-100 bg-slate-50/60" items={groups.completed} />
    </div>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}

function DeadlineGroup({
  title,
  accent,
  items,
}: {
  title: string;
  accent: string;
  items: Array<{
    _id: unknown;
    title: string;
    type: string;
    dueDate: number;
    status: string;
    link?: string;
  }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className={accent ? "" : ""}>
      <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {title === "Due today" && <AlarmClock className="size-3.5 text-amber-500" />}
        {title === "Upcoming" && <Timer className="size-3.5 text-indigo-500" />}
        {title === "Overdue" && <Clock className="size-3.5 text-rose-500" />}
        {title === "Completed" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
        {title} <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px] text-slate-600">{items.length}</span>
      </p>
      <div className={`space-y-2 rounded-xl border p-3 ${accent}`}>
        {items.map((d) => {
          const meta = TYPE_META[d.type] ?? { icon: Clock, color: "bg-slate-100 text-slate-500" };
          const Icon = meta.icon;
          const body = (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3.5 py-2.5 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{d.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatDate(d.dueDate)} · {daysUntil(d.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.status === "overdue" && (
                  <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-600">
                    Overdue
                  </Badge>
                )}
                {d.status === "due_today" && (
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-600">
                    Due today
                  </Badge>
                )}
                {d.link ? (
                  <Link to={d.link} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    Open →
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-300">{formatDateShort(d.dueDate)}</span>
                )}
              </div>
            </div>
          );
          return d.link ? (
            <Link key={String(d._id)} to={d.link} className="block">
              {body}
            </Link>
          ) : (
            <div key={String(d._id)}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}

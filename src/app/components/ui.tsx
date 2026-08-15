import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "primary",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  accent?: "primary" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
}) {
  const accentBg: Record<string, string> = {
    primary: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              accentBg[accent],
            )}
          >
            <Icon className="size-[18px]" />
          </div>
        )}
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function StatusBadge({
  label,
  className,
  dotClass,
}: {
  label: string;
  className?: string;
  dotClass?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        className ?? "bg-slate-100 text-slate-600 border-slate-200",
      )}
    >
      {dotClass && <span className={cn("size-1.5 rounded-full", dotClass)} />}
      {label}
    </Badge>
  );
}

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-full border-emerald-200 bg-emerald-50 font-semibold text-emerald-700",
        compact ? "px-2 py-0 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
      )}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      {compact ? "Verified" : "✓ Verified Company"}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressSteps({
  steps,
  current,
}: {
  steps: string[];
  current: string;
}) {
  const currentIdx = steps.indexOf(current);
  const completedIdx = current === "rejected" ? 0 : currentIdx;
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = i <= completedIdx && current !== "rejected";
        const active = i === currentIdx && current !== "rejected";
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                  done && "border-indigo-600 bg-indigo-600 text-white",
                  active &&
                    !done &&
                    "border-indigo-600 bg-white text-indigo-600 ring-4 ring-indigo-100",
                  !done &&
                    !active &&
                    "border-slate-200 bg-white text-slate-300",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium",
                  done || active ? "text-slate-700" : "text-slate-400",
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                  i < completedIdx && current !== "rejected"
                    ? "bg-indigo-600"
                    : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Heatmap({
  values,
  totalDays = 98,
  today,
}: {
  /** Map of dayStartTs -> status */
  values: Map<number, string>;
  totalDays?: number;
  today: number;
}) {
  // align cells to local start-of-day so they match attendance keys
  const d = new Date(today);
  const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const start = todayStart - (totalDays - 1) * 86400000;
  const cells: { date: number; status?: string }[] = [];
  for (let i = 0; i < totalDays; i++) {
    cells.push({ date: start + i * 86400000, status: values.get(start + i * 86400000) });
  }
  // group by weeks (columns of 7)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((cell) => {
            const status = cell.status;
            const color = status
              ? status === "present"
                ? "bg-emerald-500"
                : status === "absent"
                  ? "bg-rose-500"
                  : status === "leave"
                    ? "bg-amber-400"
                    : status === "holiday"
                      ? "bg-slate-300"
                      : "bg-yellow-400"
              : "bg-slate-100";
            return (
              <div
                key={cell.date}
                title={`${new Date(cell.date).toDateString()}${status ? ` — ${status}` : " — no report"}`}
                className={cn("size-3 rounded-[3px]", color)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function RingGauge({
  value,
  size = 96,
  stroke = 8,
  label,
  color = "#4f46e5",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(0.929 0.013 255.508)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900">{value}</span>
        {label && (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function CompanyLogo({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = {
    sm: "size-8 rounded-lg text-[11px]",
    md: "size-10 rounded-xl text-sm",
    lg: "size-14 rounded-2xl text-lg",
  };
  const palette = [
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
  ];
  const idx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        sizes[size],
        palette[idx],
      )}
    >
      {initials}
    </div>
  );
}

export function ChevronLink({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={to}
      className="group inline-flex items-center gap-0.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
    >
      {label}
      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

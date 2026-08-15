// Shared display constants (mirrors helpers in src/convex/helpers.ts)

export const APPLICATION_STATUSES: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  applied: { label: "Applied", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  under_review: { label: "Under Review", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  shortlisted: { label: "Shortlisted", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  interview: { label: "Interview", color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  selected: { label: "Selected", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  joined: { label: "Joined", color: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
};

export const APPLICATION_STEPS = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "joined",
  "completed",
] as const;

export const ATTENDANCE_STATUSES: Record<
  string,
  { label: string; color: string; heat: string }
> = {
  present: { label: "Present", color: "bg-emerald-50 text-emerald-700 border-emerald-200", heat: "bg-emerald-500" },
  absent: { label: "Absent", color: "bg-rose-50 text-rose-700 border-rose-200", heat: "bg-rose-500" },
  leave: { label: "Leave", color: "bg-amber-50 text-amber-700 border-amber-200", heat: "bg-amber-400" },
  holiday: { label: "Holiday", color: "bg-slate-100 text-slate-600 border-slate-200", heat: "bg-slate-300" },
  pending: { label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200", heat: "bg-yellow-400" },
};

export const REPORT_STATUSES: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Pending Review", color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Needs Revision", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const VERIFICATION_STATUSES: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Pending Verification", color: "bg-amber-50 text-amber-700 border-amber-200" },
  verified: { label: "✓ Verified Company", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
  suspended: { label: "Suspended", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const CERT_STATUSES: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  pending: { label: "Pending Review", emoji: "🟡", color: "bg-amber-50 text-amber-700 border-amber-200" },
  verified: { label: "Verified", emoji: "🟢", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  requires_review: { label: "Requires Review", emoji: "🟡", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  suspicious: { label: "Suspicious", emoji: "🔴", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
  wfh: "Work From Home",
};

export const TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  summer: "Summer",
  winter: "Winter",
  project: "Project",
};

export const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
  oncampus: "On-campus internship",
  offcampus: "Off-campus internship",
  collegeprovided: "College-provided internship",
  selffound: "Self-found internship",
};

export const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Information Technology",
  "Mechanical",
  "Civil",
  "Electrical",
];

export function formatDate(ts: number | undefined | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(ts: number | undefined | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function daysUntil(ts: number): string {
  const diff = Math.round((ts - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Tomorrow";
  return `${diff} days left`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateShort(ts);
}

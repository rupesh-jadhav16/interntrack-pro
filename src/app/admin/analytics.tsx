import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { APPLICATION_STATUSES, timeAgo } from "@/lib/constants";
import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/ui";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
  const stats = useQuery(api.admin.stats);
  const logs = useQuery(api.admin.activityLog, { limit: 15 });

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
      </div>
    );
  }

  const appData = Object.entries(stats.applicationStatusCounts as Record<string, number>).map(([name, value]) => ({
    name: APPLICATION_STATUSES[name]?.label ?? name,
    value,
  }));
  const domainData = Object.entries(stats.domainCounts as Record<string, number>).map(([name, value]) => ({
    name,
    value,
  }));
  const deptData = stats.byDepartment.map((d) => ({ name: d.department.split(" ")[0], students: d.count }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="College-wide analytics"
        subtitle="Department statistics, domain distribution, application flow and the full audit log."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Students by department</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(79,70,229,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="students" name="Students" radius={[6, 6, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Internships by domain</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={domainData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {domainData.map((d, i) => (
                    <Cell key={i} fill={["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#6366f1"][i % 8]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Application pipeline flow</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(16,185,129,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" name="Applications" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(logs ?? []).map((log) => (
              <div key={log._id} className="rounded-lg bg-slate-50/70 px-3 py-2">
                <p className="text-[12px] font-semibold text-slate-700">{log.action}</p>
                <p className="line-clamp-1 text-[11px] text-slate-400">{log.details}</p>
                <p className="text-[10px] text-slate-300">{timeAgo(log.createdAt)} · {log.actor}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

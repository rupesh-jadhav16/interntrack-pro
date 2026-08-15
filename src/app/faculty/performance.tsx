import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
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

export default function FacultyPerformance() {
  const students = useQuery(api.faculty.myStudents) ?? [];
  const trend = useQuery(api.faculty.performanceTrend) ?? [];

  const attData = students.map((s) => ({
    name: s.student.name.split(" ")[0],
    attendance: s.attendancePct,
    reports: s.reportCount,
  }));

  const riskData = [
    { name: "On track", value: students.filter((s) => !s.atRisk).length, color: "#10b981" },
    { name: "At risk", value: students.filter((s) => s.atRisk).length, color: "#f43f5e" },
    { name: "No internship", value: students.filter((s) => !s.enrollment).length, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Student performance analytics"
        subtitle="Attendance trends, report submission volume and student health across your cohort."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Attendance by student</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {students.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(79,70,229,0.06)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="attendance" name="Attendance %" radius={[6, 6, 0, 0]} fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Report submission trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="reports" name="Daily reports" stroke="#4f46e5" strokeWidth={2.5} fill="url(#repGrad)" />
                <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="#0ea5e9" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Cohort health</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={2}>
                  {riskData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 pb-2 text-[11px] text-slate-500">
              {riskData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Reports submitted per student</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(14,165,233,0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="reports" name="Daily reports" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

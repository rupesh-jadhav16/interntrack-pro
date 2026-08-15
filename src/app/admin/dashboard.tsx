import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  Clock,
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatCard } from "../components/ui";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.stats);
  const certificates = useQuery(api.certificates.allCertificates, { queueOnly: true });

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const pendingQueue =
    (certificates ?? []).filter((c) => c.certificate.verificationStatus === "suspicious" || c.certificate.verificationStatus === "requires_review" || c.certificate.verificationStatus === "pending").length;
  const statusData = Object.entries(stats.applicationStatusCounts as Record<string, number>).map(([name, value]) => ({
    name: APPLICATION_STATUSES[name]?.label ?? name,
    value,
  }));
  const companyData = Object.entries(stats.companyStatusCounts as Record<string, number>).map(([name, value]) => ({
    name: name === "verified" ? "Verified" : name === "pending" ? "Pending" : name === "rejected" ? "Rejected" : "Suspended",
    value,
    color:
      name === "verified" ? "#10b981" : name === "pending" ? "#f59e0b" : name === "rejected" ? "#f43f5e" : "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="T&P Cell Overview"
        title="What's happening across the college?"
        subtitle="Every internship, application, verification and at-risk student — college-wide visibility in one place."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-slate-200 bg-white">
              <Link to="/app/verification">
                <BadgeCheck className="size-4" /> Verify ({stats.pendingCompanyVerification})
              </Link>
            </Button>
            <Button asChild>
              <Link to="/app/certificates">
                <Clock className="size-4" /> Review queue ({pendingQueue})
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={stats.totalStudents} icon={GraduationCap} accent="primary" hint={`${stats.studentsInterning} interning now`} />
        <StatCard label="Active internships" value={stats.activeInternships} icon={TrendingUp} accent="emerald" hint={`${stats.completedInternships} completed`} />
        <StatCard label="Students at risk" value={stats.studentsAtRisk} icon={AlertTriangle} accent="rose" />
        <StatCard label="Companies" value={stats.totalCompanies} icon={Building2} accent="amber" hint={`${stats.verifiedCompanies} verified · ${stats.pendingCompanyVerification} pending`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Total applications" value={stats.totalApplications} />
        <MiniStat label="Without internship" value={stats.studentsWithoutInternship} />
        <MiniStat label="Daily reports logged" value={stats.totalDailyReports} />
        <MiniStat label="Open internships" value={stats.openInternships} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Attendance trend (8 weeks)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="present" name="Present days" stroke="#4f46e5" strokeWidth={2.5} fill="url(#attGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Applications by status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={["#4f46e5", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#14b8a6", "#059669"][i % 8]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="size-4 text-indigo-600" /> Companies by status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {companyData.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50/70 px-3 py-2">
                <span className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.name}
                </span>
                <span className="text-sm font-bold text-slate-900">{c.value}</span>
              </div>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/app/companies">Manage companies</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Students by department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byDepartment.map((d) => {
              const pct = stats.totalStudents ? Math.round((d.count / stats.totalStudents) * 100) : 0;
              return (
                <div key={d.department}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-600">{d.department}</span>
                    <span className="font-bold text-slate-800">{d.count} students</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white">
                <Link to="/app/students"><Users className="size-3.5" /> All students</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white">
                <Link to="/app/applications"><FileText className="size-3.5" /> Applications</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white">
                <Link to="/app/analytics"><TrendingUp className="size-3.5" /> Full analytics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="card-elevated rounded-xl border-slate-200/80 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

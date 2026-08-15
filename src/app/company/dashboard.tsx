import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { APPLICATION_STATUSES, timeAgo } from "@/lib/constants";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Briefcase,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { CompanyLogo, PageHeader, StatCard, StatusBadge, VerifiedBadge } from "../components/ui";

export default function CompanyDashboard() {
  const company = useQuery(api.profiles.myCompanyProfile);
  const internships = useQuery(api.internships.myCompanyInternships);
  const applications = useQuery(api.applications.listForCompany);
  const interns = useQuery(api.enrollments.companyInterns);
  const announcements = useQuery(api.notifications.announcements);

  if (company === undefined) {
    return <div className="h-96 animate-pulse rounded-2xl border border-slate-200" />;
  }

  const totalApps = applications?.length ?? 0;
  const pendingApps = applications?.filter((a) => ["applied", "under_review"].includes(a.application.status)).length ?? 0;
  const shortlisted = applications?.filter((a) => ["shortlisted", "interview", "selected"].includes(a.application.status)).length ?? 0;
  const candidates = new Set((applications ?? []).map((a) => a.student?._id)).size;
  const activeInterns = interns?.filter((i) => i.enrollment.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company Overview"
        title={company ? `Welcome back, ${company.name}.` : "Welcome."}
        subtitle={
          company?.verificationStatus === "verified"
            ? "Your company is verified — students can see the ✓ badge on all your internships."
            : company?.verificationStatus === "pending"
              ? "Your profile is pending T&P verification. You can still post internships in the meantime."
              : "Set up your company profile to start posting internships."
        }
        actions={
          <Button asChild>
            <Link to="/app/internships">
              <Briefcase className="size-4" /> Post an internship
            </Link>
          </Button>
        }
      />

      {company && company.verificationStatus === "pending" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          Your company is awaiting verification by the T&P Cell. The ✓ Verified badge will appear on your internships once approved.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open internships" value={internships?.filter((i) => i.internship.status === "open").length ?? 0} icon={Briefcase} accent="primary" />
        <StatCard label="Applications" value={totalApps} icon={FileText} accent="primary" hint={`${pendingApps} awaiting review`} />
        <StatCard label="Candidates" value={candidates} icon={Users} accent="emerald" hint={`${shortlisted} shortlisted/interviewing`} />
        <StatCard label="Current interns" value={activeInterns} icon={Clock} accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-600" /> Recent applications
              </span>
              <Link to="/app/applications" className="text-xs font-semibold text-indigo-600">Manage pipeline →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(applications ?? []).length === 0 && (
              <p className="py-6 text-center text-[13px] text-slate-400">
                No applications yet — they'll appear here as students apply.
              </p>
            )}
            {(applications ?? []).slice(0, 4).map(({ application, internship, student }) => (
              <div key={application._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-[11px] font-bold text-white">
                    {student?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">{student?.name}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {internship?.title} · {timeAgo(application.appliedAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  label={APPLICATION_STATUSES[application.status]?.label ?? application.status}
                  className={APPLICATION_STATUSES[application.status]?.color}
                  dotClass={APPLICATION_STATUSES[application.status]?.dot}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Users className="size-4 text-indigo-600" /> Current interns
              </span>
              <Link to="/app/interns" className="text-xs font-semibold text-indigo-600">All →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(interns ?? []).length === 0 && (
              <p className="py-6 text-center text-[13px] text-slate-400">No interns yet.</p>
            )}
            {(interns ?? []).slice(0, 4).map(({ enrollment, student }) => (
              <div key={enrollment._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{student?.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{enrollment.role}</p>
                </div>
                <Badge
                  className={`rounded-full text-[10px] font-semibold ${enrollment.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                  variant="outline"
                >
                  {enrollment.status === "active" ? "Active" : "Completed"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Announcements + profile */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated rounded-xl border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Megaphone className="size-4 text-indigo-600" /> College announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(announcements ?? []).slice(0, 3).map((a) => (
              <div key={a._id} className="rounded-lg bg-slate-50/70 px-3 py-2.5">
                <p className="text-[12px] font-bold text-slate-800">📢 {a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-slate-500">{a.message}</p>
              </div>
            ))}
            {(announcements ?? []).length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">No announcements.</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated rounded-xl border-slate-200/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Briefcase className="size-4 text-indigo-600" /> Your company profile
              </span>
              {company?.verificationStatus === "verified" && <VerifiedBadge />}
              {company?.verificationStatus === "pending" && (
                <StatusBadge label="Pending verification" className="border-amber-200 bg-amber-50 text-amber-700" dotClass="bg-amber-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <CompanyLogo name={company?.name ?? "?"} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900">{company?.name}</p>
                <p className="text-[13px] text-slate-500">{company?.industry} · {company?.city}</p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-slate-600">{company?.description}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white">
                <Link to="/app/profile">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

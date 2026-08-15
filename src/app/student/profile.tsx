import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { DEPARTMENTS, formatDate } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Award,
  Download,
  FileSignature,
  Flame,
  GraduationCap,
  Pencil,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/ui";
import { cn } from "@/lib/utils";

export default function StudentProfile() {
  const profile = useQuery(api.profiles.myStudentProfile);
  const rewards = useQuery(api.rewards.getMyRewards);
  const enrollments = useQuery(api.enrollments.myEnrollments);
  const consentLetters = useQuery(api.consent.myConsentLetters);
  const updateProfile = useMutation(api.profiles.updateStudentProfile);
  const acknowledge = useMutation(api.consent.acknowledge);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [year, setYear] = useState("3");
  const [semester, setSemester] = useState("6");
  const [cgpa, setCgpa] = useState("");
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const openEdit = () => {
    if (!profile) return;
    setName(profile.name);
    setDepartment(profile.department);
    setYear(String(profile.year));
    setSemester(String(profile.semester));
    setCgpa(String(profile.cgpa));
    setSkills(profile.skills.join(", "));
    setCity(profile.city);
    setResumeUrl(profile.resumeUrl ?? "");
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({
        name,
        department,
        year: Number(year),
        semester: Number(semester),
        cgpa: Number(cgpa),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        city,
        resumeUrl: resumeUrl || undefined,
      });
      toast.success("Profile updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge({ letterId: id as never });
      toast.success("Letter acknowledged ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not acknowledge");
    }
  };

  const handleDownload = () => {
    if (!profile) return;
    const lines = [
      "INTERNTRACKER — INTERNSHIP PROFILE",
      "==================================",
      "",
      `Name: ${profile.name}`,
      `College: ${profile.college}`,
      `Department: ${profile.department} (${profile.branch})`,
      `Year: ${profile.year} · Semester: ${profile.semester}`,
      `CGPA: ${profile.cgpa}`,
      `City: ${profile.city}`,
      "",
      "Skills:",
      ...profile.skills.map((s) => `  • ${s}`),
      "",
      `Points: ${rewards?.points ?? 0} · Rank: #${rewards?.rank ?? "—"}`,
      `Streak: ${rewards?.currentStreak ?? 0} days · Longest: ${rewards?.longestStreak ?? 0}`,
      `Badges: ${rewards?.badges.filter((b) => b.earned).map((b) => b.name).join(", ") || "none"}`,
      "",
      "Internships:",
      ...(enrollments ?? []).map(
        (e) =>
          `  • ${e.enrollment.role} @ ${e.enrollment.companyName} (${e.enrollment.status}) ${formatDate(e.enrollment.startDate)} → ${formatDate(e.enrollment.endDate)}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name.replace(/\s/g, "_")}_Internship_Profile.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) {
    return <div className="h-96 animate-pulse rounded-2xl border border-slate-200" />;
  }

  const earnedBadges = rewards?.badges.filter((b) => b.earned) ?? [];
  const pendingLetters = consentLetters?.filter((l) => l.status === "generated") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="My profile"
        subtitle="Your professional internship profile. Companies and faculty only see what's relevant to them."
        actions={
          <>
            <Button variant="outline" className="border-slate-200 bg-white" onClick={handleDownload}>
              <Download className="size-4" /> Download profile
            </Button>
            <Button onClick={openEdit}>
              <Pencil className="size-4" /> Edit profile
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="card-elevated overflow-hidden rounded-2xl border-slate-200/80">
          <div className="h-20 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-400" />
          <CardContent className="-mt-10 p-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-sky-400 text-2xl font-extrabold text-white shadow-lg">
                {profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900">{profile.name}</h2>
              <p className="text-[13px] text-slate-500">
                {profile.department} · {profile.branch} · Year {profile.year}
              </p>
              <p className="text-[12px] text-slate-400">{profile.college}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-semibold text-slate-600">
                  CGPA {profile.cgpa}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-semibold text-slate-600">
                  {profile.city}
                </Badge>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600">Profile completion</span>
                <span className="font-bold text-indigo-600">{profile.profileCompletion}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-sky-400" style={{ width: `${profile.profileCompletion}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Complete your skills and resume to reach 100%.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <div>
                <p className="flex items-center justify-center gap-1 text-base font-bold text-slate-900">
                  <Flame className="size-3.5 text-orange-500" /> {rewards?.currentStreak ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">Streak</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{rewards?.points ?? 0}</p>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">Points</p>
              </div>
              <div>
                <p className="text-base font-bold text-indigo-600">#{rewards?.rank ?? "—"}</p>
                <p className="text-[9px] uppercase tracking-wide text-slate-400">Rank</p>
              </div>
            </div>

            {profile.resumeUrl && (
              <a
                href={profile.resumeUrl.startsWith("http") ? profile.resumeUrl : `https://${profile.resumeUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-lg bg-indigo-50 py-2 text-center text-[13px] font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                View resume ↗
              </a>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="card-elevated rounded-xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Skills & certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[12px] font-medium text-indigo-700">{s}</span>
                ))}
              </div>
              {profile.certifications.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Certifications</p>
                  <ul className="space-y-1.5">
                    {profile.certifications.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-[13px] text-slate-600">
                        <ShieldCheck className="size-3.5 text-emerald-500" /> {c}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated rounded-xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Award className="size-4 text-amber-500" /> Achievements & badges
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {earnedBadges.length === 0 && (
                <p className="text-[13px] text-slate-400">No badges yet — submit your first report to earn one!</p>
              )}
              {earnedBadges.map((b) => (
                <div key={b.name} title={b.description} className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-800">
                  <span>{b.emoji}</span> {b.name}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="card-elevated rounded-xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <GraduationCap className="size-4 text-indigo-600" /> Internship history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(enrollments ?? []).length === 0 && (
                <p className="text-[13px] text-slate-400">No internships tracked yet.</p>
              )}
              {(enrollments ?? []).map(({ enrollment }) => (
                <div key={enrollment._id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5">
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">{enrollment.role}</p>
                    <p className="text-[12px] text-slate-500">
                      {enrollment.companyName} · {formatDate(enrollment.startDate)} → {formatDate(enrollment.endDate)}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full",
                      enrollment.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-500",
                    )}
                    variant="outline"
                  >
                    {enrollment.status === "active" ? "Active" : "Completed"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Consent letters */}
          <Card className="card-elevated rounded-xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileSignature className="size-4 text-indigo-600" /> Consent & acknowledgement letters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(consentLetters ?? []).length === 0 && (
                <p className="text-[13px] text-slate-400">
                  Generated when an application is rejected or an internship situation requires T&P notification.
                </p>
              )}
              {(consentLetters ?? []).map((letter) => (
                <div key={letter._id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{letter.title}</p>
                      <p className="text-[12px] text-slate-500">{letter.companyName} · {formatDate(letter.createdAt)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        letter.status === "acknowledged"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}
                    >
                      {letter.status === "acknowledged" ? "✓ Acknowledged" : "Awaiting acknowledgement"}
                    </Badge>
                  </div>
                  <p className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-5 text-slate-600">
                    {letter.reason}
                  </p>
                  {letter.status === "generated" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => handleAcknowledge(letter._id as string)}>
                      <FileSignature className="size-3.5" /> Acknowledge digitally
                    </Button>
                  )}
                </div>
              ))}
              {pendingLetters.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  {pendingLetters.length} letter(s) awaiting your acknowledgement.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Keep your details current — companies and faculty see this information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Department">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4"].map((y) => (
                      <SelectItem key={y} value={y}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                      <SelectItem key={s} value={s}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="CGPA">
                <Input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} required />
              </Field>
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} required />
              </Field>
            </div>
            <Field label="Skills (comma separated)">
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
            </Field>
            <Field label="Resume URL (optional)">
              <Input value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://…/resume.pdf" />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={busy}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

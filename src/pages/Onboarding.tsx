import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/constants";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  GraduationCap,
  Loader2,
  Sparkles,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

type Role = "student" | "faculty" | "admin" | "company";

const ROLES: Array<{
  id: Role;
  label: string;
  icon: typeof GraduationCap;
  description: string;
  tint: string;
}> = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    description: "Explore internships, track your work, build streaks & rank on the leaderboard.",
    tint: "bg-indigo-50 text-indigo-600 ring-indigo-200",
  },
  {
    id: "faculty",
    label: "Faculty",
    icon: UserCog,
    description: "Monitor assigned students, verify daily & weekly reports, flag at-risk interns.",
    tint: "bg-sky-50 text-sky-600 ring-sky-200",
  },
  {
    id: "admin",
    label: "T&P Cell",
    icon: Building2,
    description: "College-wide visibility: verify companies, approve internships, manage everyone.",
    tint: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  },
  {
    id: "company",
    label: "Company",
    icon: Briefcase,
    description: "Post internships, shortlist candidates and monitor your interns' daily work.",
    tint: "bg-amber-50 text-amber-600 ring-amber-200",
  },
];

export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRoleMut = useMutation(api.profiles.setRole);
  const onboardStudent = useMutation(api.profiles.onboardStudent);
  const onboardFaculty = useMutation(api.profiles.onboardFaculty);
  const onboardCompany = useMutation(api.profiles.onboardCompany);

  // student form
  const [name, setName] = useState("");
  const [college, setCollege] = useState("National Institute of Technology");
  const [department, setDepartment] = useState("Computer Science");
  const [branch, setBranch] = useState("CSE");
  const [year, setYear] = useState("3");
  const [semester, setSemester] = useState("6");
  const [cgpa, setCgpa] = useState("");
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("");

  // faculty form
  const [fName, setFName] = useState("");
  const [fDept, setFDept] = useState("Computer Science");
  const [designation, setDesignation] = useState("Professor");

  // company form
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cWebsite, setCWebsite] = useState("");
  const [cReg, setCReg] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cCity, setCCity] = useState("");
  const [cIndustry, setCIndustry] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cRecruiter, setCRecruiter] = useState("");
  const [cRecruiterEmail, setCRecruiterEmail] = useState("");

  useEffect(() => {
    if (!isLoading && user?.role) {
      navigate("/app", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await setRoleMut({ role: role! });
      if (role === "student") {
        await onboardStudent({
          name,
          college,
          department,
          branch,
          year: Number(year),
          semester: Number(semester),
          cgpa: Number(cgpa),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          city,
        });
      } else if (role === "faculty") {
        await onboardFaculty({ name: fName, department: fDept, designation });
      } else if (role === "company") {
        await onboardCompany({
          name: cName,
          email: cEmail,
          website: cWebsite,
          registrationInfo: cReg,
          address: cAddress,
          city: cCity,
          industry: cIndustry,
          description: cDesc,
          recruiterName: cRecruiter,
          recruiterEmail: cRecruiterEmail,
        });
      }
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-400 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Set up your workspace
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">
            Choose how you'll use InternTracker. Your role decides your
            dashboard, permissions and features.
          </p>
        </div>

        {!role ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={cn(
                  "group rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70",
                )}
              >
                <div className={cn("flex size-11 items-center justify-center rounded-xl ring-1", r.tint)}>
                  <r.icon className="size-5" />
                </div>
                <p className="mt-3.5 text-base font-bold text-slate-900">{r.label}</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-500">{r.description}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Continue <ArrowRight className="size-3.5" />
                </p>
              </button>
            ))}
          </div>
        ) : (
          <Card className="card-elevated overflow-hidden rounded-2xl border-slate-200/80">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={() => setRole(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {ROLES.find((r) => r.id === role)?.label}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {role === "student" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
                      </Field>
                      <Field label="College">
                        <Input value={college} onChange={(e) => setCollege(e.target.value)} required />
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
                      <Field label="Branch">
                        <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. CSE" required />
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
                        <Input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="8.5" required />
                      </Field>
                      <Field label="City">
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" required />
                      </Field>
                    </div>
                    <Field label="Skills (comma separated)">
                      <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, SQL" required />
                    </Field>
                  </>
                )}

                {role === "faculty" && (
                  <>
                    <Field label="Full name">
                      <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="e.g. Dr. Kavita Rao" required />
                    </Field>
                    <Field label="Department">
                      <Select value={fDept} onValueChange={setFDept}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Designation">
                      <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Professor" required />
                    </Field>
                    <p className="rounded-xl bg-sky-50 px-4 py-3 text-[13px] leading-6 text-sky-800">
                      Demo students from your department will be assigned to you
                      automatically so you can start reviewing reports right away.
                    </p>
                  </>
                )}

                {role === "company" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Company name">
                        <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. TechFlow Systems" required />
                      </Field>
                      <Field label="Official email">
                        <Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="careers@company.com" required />
                      </Field>
                      <Field label="Website">
                        <Input value={cWebsite} onChange={(e) => setCWebsite(e.target.value)} placeholder="company.com" required />
                      </Field>
                      <Field label="Registration info">
                        <Input value={cReg} onChange={(e) => setCReg(e.target.value)} placeholder="CIN / registration number" required />
                      </Field>
                      <Field label="City">
                        <Input value={cCity} onChange={(e) => setCCity(e.target.value)} placeholder="e.g. Bengaluru" required />
                      </Field>
                      <Field label="Industry">
                        <Input value={cIndustry} onChange={(e) => setCIndustry(e.target.value)} placeholder="e.g. Software" required />
                      </Field>
                    </div>
                    <Field label="Registered address">
                      <Input value={cAddress} onChange={(e) => setCAddress(e.target.value)} placeholder="Street, city, state" required />
                    </Field>
                    <Field label="Company description">
                      <Textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="What does your company do? What do interns work on?" rows={3} required />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Recruiter name">
                        <Input value={cRecruiter} onChange={(e) => setCRecruiter(e.target.value)} placeholder="e.g. Sarah Chen" required />
                      </Field>
                      <Field label="Recruiter email">
                        <Input type="email" value={cRecruiterEmail} onChange={(e) => setCRecruiterEmail(e.target.value)} placeholder="recruiter@company.com" required />
                      </Field>
                    </div>
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-800">
                      Your company will be submitted for T&P Cell verification.
                      Until then you can still post internships — the ✓ Verified
                      badge appears once approved.
                    </p>
                  </>
                )}

                {role === "admin" && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-4 text-[13px] leading-6 text-emerald-800">
                    You'll get full T&P Cell access: verify companies, review
                    certificates, monitor every student, configure rewards and
                    view college-wide analytics. Demo data is pre-seeded so every
                    dashboard is populated.
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-medium text-rose-700">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl text-sm font-semibold">
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Setting up…
                    </>
                  ) : (
                    <>
                      Create my workspace <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
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

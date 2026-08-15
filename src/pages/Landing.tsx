import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpenCheck,
  Briefcase,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Flame,
  Gift,
  GraduationCap,
  Layers,
  MapPin,
  Medal,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: EASE },
};

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-400 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="size-5" />
          </div>
          <div className="leading-none">
            <p className="text-[17px] font-bold tracking-tight text-slate-900">
              InternTracker
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Campus OS
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#how" className="transition-colors hover:text-slate-900">How it works</a>
          <a href="#benefits" className="transition-colors hover:text-slate-900">Benefits</a>
          <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
          <a href="#testimonials" className="transition-colors hover:text-slate-900">Stories</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden text-slate-600 sm:inline-flex">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function DashboardMock() {
  const nav = ["Dashboard", "Explorer", "Tracker", "Reports", "Streaks", "Profile"];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden w-44 shrink-0 bg-slate-900 p-3 sm:block">
          <div className="mb-4 flex items-center gap-2 px-1.5">
            <div className="flex size-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-sky-400 text-white">
              <Sparkles className="size-2.5" />
            </div>
            <p className="text-[11px] font-bold text-white">InternTracker</p>
          </div>
          <div className="space-y-1">
            {nav.map((n, i) => (
              <div
                key={n}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-medium ${
                  i === 0
                    ? "bg-white/10 text-white"
                    : "text-slate-400"
                }`}
              >
                <span className={`size-1.5 rounded-full ${i === 0 ? "bg-indigo-400" : "bg-slate-600"}`} />
                {n}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-white/5 p-2">
            <p className="text-[9px] text-slate-400">Streak</p>
            <p className="flex items-center gap-1 text-[11px] font-bold text-white">
              <Flame className="size-3 text-orange-400" /> 12 days
            </p>
          </div>
        </div>
        {/* mini content */}
        <div className="flex-1 space-y-3 bg-slate-50 p-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600">
              Dashboard Overview
            </p>
            <p className="text-sm font-bold text-slate-900">Welcome back, Alex.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative size-10">
                  <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeDasharray="100.5" strokeDashoffset="18" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-900">82</span>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-500">Readiness</p>
                  <p className="text-[10px] font-bold text-emerald-600">↗ +4 pts</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <p className="text-[9px] font-semibold text-slate-500">Department Rank</p>
              <p className="mt-1 text-base font-bold text-indigo-700">Top 5%</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-700">Current Applications</p>
              <Badge className="rounded-full border-indigo-200 bg-indigo-50 px-2 text-[9px] font-semibold text-indigo-600">In Progress</Badge>
            </div>
            <div className="mt-2.5 flex items-center">
              {["Applied", "Shortlisted", "Interview", "Selected"].map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className={`flex size-4 items-center justify-center rounded-full text-[7px] font-bold ${i < 3 ? "bg-indigo-600 text-white" : "border-2 border-slate-200 bg-white text-slate-300"}`}>
                    {i < 2 ? "✓" : i === 2 ? "3" : "4"}
                  </div>
                  <p className="ml-1 whitespace-nowrap text-[8px] font-medium text-slate-500">{s}</p>
                  {i < 3 && <div className={`mx-1 h-0.5 flex-1 rounded ${i < 2 ? "bg-indigo-600" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold text-slate-700">Skill Competency</p>
            <div className="mt-2 space-y-1.5">
              {[
                ["Frontend", 92, "Strong"],
                ["Backend", 74, "Proficient"],
                ["Data Science", 45, "Developing"],
              ].map(([label, pct, tag]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <p className="w-20 text-[9px] text-slate-500">{label}</p>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="w-14 text-right text-[9px] font-semibold text-slate-600">{tag}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { value: "4,200+", label: "Internships tracked" },
  { value: "850+", label: "Verified companies" },
  { value: "38", label: "Partner colleges" },
  { value: "92%", label: "Report completion" },
];

const HOW_STEPS = [
  {
    icon: Users,
    title: "Create your role-based account",
    text: "Students, faculty, T&P cells and companies each get a tailored workspace with permissions scoped to their job.",
  },
  {
    icon: Search,
    title: "Explore verified internships",
    text: "Search, filter and save roles from verified companies only. No spam, no unverified listings — every badge is earned.",
  },
  {
    icon: Rocket,
    title: "Apply & get tracked",
    text: "Apply in one click, follow your pipeline from Applied to Interview, and activate your internship tracker when selected.",
  },
  {
    icon: ClipboardList,
    title: "Report, verify & grow",
    text: "Daily attendance and reports build streaks and points. Faculty verify, companies review, and the whole college sees progress.",
  },
];

const STUDENT_FEATURES = [
  { icon: Flame, title: "Daily streaks", text: "GitHub-style contribution heatmaps and 🔥 streaks that make consistency addictive." },
  { icon: Trophy, title: "College leaderboard", text: "Earn points for reports, attendance and completions — compete department-wide." },
  { icon: ShieldCheck, title: "Certificate verification", text: "AI-assisted authenticity scores on every certificate, with T&P manual review." },
  { icon: MapPin, title: "Location-based discovery", text: "Find internships near you, or filter by Remote, Hybrid and On-site." },
];

const COLLEGE_FEATURES = [
  { icon: BadgeCheck, title: "Verified company system", text: "T&P cells review registrations and issue ✓ Verified badges — students apply with confidence." },
  { icon: BarChart3, title: "College-wide analytics", text: "Attendance trends, department stats, completion rates and at-risk flags in one dashboard." },
  { icon: Bell, title: "Automated weekly updates", text: "Every student gets a weekly summary generated automatically for faculty and T&P." },
  { icon: Medal, title: "Ranking & rewards engine", text: "Configurable points, badges and leaderboards that drive real engagement." },
];

const COMPANY_FEATURES = [
  { icon: Briefcase, title: "Post & manage internships", text: "Create listings with stipend, mode, skills and deadlines — edit and close anytime." },
  { icon: Users, title: "Pipeline management", text: "Shortlist, schedule interviews, select and reject — students are notified at every step." },
  { icon: CalendarCheck2, title: "Monitor intern work", text: "View attendance and daily reports for your interns only — never the whole student body." },
  { icon: Wallet, title: "Trusted employer brand", text: "A verified badge signals quality, attracting the most consistent students from partner colleges." },
];

const TESTIMONIALS = [
  {
    name: "Rahul Sharma",
    role: "Software Engineering Intern, TechFlow",
    quote:
      "The streak system kept me consistent through all 6 months. My mentor could see my daily reports and my college could verify my work — everything in one place.",
  },
  {
    name: "Dr. Kavita Rao",
    role: "T&P Coordinator, NIT",
    quote:
      "We used to chase students for reports. Now weekly summaries arrive automatically and at-risk students are flagged before they fall behind.",
  },
  {
    name: "Sarah Chen",
    role: "Recruiting Lead, TechFlow",
    quote:
      "Verified company status changed everything. We now get applicants with proven consistency, and we can review their actual daily work before converting.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 size-96 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute right-0 top-40 size-96 rounded-full bg-sky-200/40 blur-3xl" />
        </div>
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <Badge className="mb-5 gap-1.5 rounded-full border-indigo-200 bg-white px-3 py-1 text-[11px] font-semibold text-indigo-700">
              <Sparkles className="size-3" />
              The complete internship management platform
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
              Track. Verify. Grow.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Your Complete Internship
              </span>{" "}
              Management Platform.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              InternshipTracker connects students, colleges, faculty, and
              verified companies in one transparent internship ecosystem.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-indigo-500/25">
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-11 px-4 text-sm font-semibold text-indigo-600">
                <Link to="/auth">
                  Explore Internships
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">{s.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-sky-400/10 blur-2xl" />
            <DashboardMock />
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> 12-day streak
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <BadgeCheck className="size-3.5 text-indigo-500" /> 3 verified offers
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <TrendingUp className="size-3.5 text-emerald-500" /> Top 5% rank
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              From application to completion, one pipeline
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Four roles, one ecosystem. Every stage of the internship journey is
              tracked, verified and celebrated.
            </p>
          </motion.div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                className="card-elevated group relative rounded-2xl border border-slate-200/80 bg-white p-6 transition-transform hover:-translate-y-1"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <step.icon className="size-5" />
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Step {i + 1}</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="bg-white py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Built for every role</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              One platform, four perspectives
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Students build habits. Colleges get visibility. Companies get
              verified talent. T&P cells get control.
            </p>
          </motion.div>

          <div className="mt-14 space-y-10">
            {[
              { icon: GraduationCap, title: "Benefits for Students", tint: "bg-indigo-50 text-indigo-600", features: STUDENT_FEATURES },
              { icon: Building2, title: "Benefits for Colleges & T&P Cells", tint: "bg-emerald-50 text-emerald-600", features: COLLEGE_FEATURES },
              { icon: Briefcase, title: "Benefits for Companies", tint: "bg-amber-50 text-amber-600", features: COMPANY_FEATURES },
            ].map((group, gi) => (
              <motion.div key={group.title} {...fadeUp} transition={{ duration: 0.5, delay: gi * 0.05, ease: EASE }}>
                <div className="mb-5 flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${group.tint}`}>
                    <group.icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{group.title}</h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {group.features.map((f) => (
                    <div key={f.title} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 transition-colors hover:border-indigo-200 hover:bg-white">
                      <f.icon className="size-5 text-slate-700" />
                      <h4 className="mt-3 text-sm font-bold text-slate-900">{f.title}</h4>
                      <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{f.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES DEEP DIVE */}
      <section id="features" className="bg-slate-950 py-20 text-white lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-400">Platform depth</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything an internship ecosystem needs
            </h2>
          </motion.div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Fake certificate detection", text: "AI-assisted authenticity scoring with suspicious-indicator reports. T&P admins review every flag — we never claim machines are infallible." },
              { icon: BadgeCheck, title: "Verified company system", text: "Companies submit registrations, official emails and documents. The T&P cell issues a prominent ✓ Verified badge students can filter by." },
              { icon: Flame, title: "Daily reporting streaks", text: "LeetCode-style contribution heatmaps. 🔥 7, 14, 30, 60 and 100-day streaks with milestone badges and bonus points." },
              { icon: BarChart3, title: "College ranking engine", text: "Points for reports, attendance, completions and consistency feed a transparent, department-filterable leaderboard." },
              { icon: Gift, title: "Rewards & achievements", text: "+10 per daily report, +50 weekly, +500 completion — plus badges like Consistent Intern and Internship Champion. Fully configurable." },
              { icon: BookOpenCheck, title: "Consent letter system", text: "Rejections and status changes auto-generate acknowledgement letters students preview, download and sign digitally." },
              { icon: CalendarCheck2, title: "Attendance monitoring", text: "Check-in/check-out, total hours, work summaries and mentor verification — visualized as a color-coded calendar." },
              { icon: Bell, title: "Automated weekly updates", text: "Every week, faculty and T&P receive generated summaries: attendance %, reports submitted, hours and streak per student." },
              { icon: Target, title: "Deadline management", text: "Application deadlines, interviews, daily report cut-offs and completion dates — grouped as Upcoming, Due Today and Overdue." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-indigo-400/40 hover:bg-white/10"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-10 md:grid-cols-4 lg:p-14">
            {[
              { icon: GraduationCap, value: "12,400+", label: "Active students" },
              { icon: Briefcase, value: "4,200+", label: "Internships tracked" },
              { icon: BadgeCheck, value: "850+", label: "Verified companies" },
              { icon: Trophy, value: "98%", label: "Report completion" },
            ].map((s, i) => (
              <motion.div key={s.label} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }} className="text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <s.icon className="size-5" />
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Stories</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Loved by students, faculty and recruiters
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                className="card-elevated flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6"
              >
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className="text-sm">★</span>
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-slate-600">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
                    {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-white py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
        </div>
        <motion.div {...fadeUp} className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-400 text-white shadow-xl shadow-indigo-500/30">
            <Rocket className="size-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Ready to bring transparency to your internship program?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            Join the colleges and companies already tracking, verifying and
            celebrating internship success on one platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-8 text-sm font-semibold shadow-lg shadow-indigo-500/25">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-8 text-sm font-semibold">
              <Link to="/auth">Log in to your account</Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Layers className="size-3.5" /> No setup fees · Demo data included · For students, colleges & companies
          </p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-950 py-14 text-slate-400">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white">
                  <Sparkles className="size-4" />
                </div>
                <p className="text-[15px] font-bold text-white">InternTracker</p>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Track. Verify. Grow. The complete internship management platform
                for colleges, students, faculty and verified companies.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Platform</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#how" className="hover:text-white">How it works</a></li>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#benefits" className="hover:text-white">Benefits</a></li>
                <li><Link to="/auth" className="hover:text-white">Get started</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">For Students</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Internship explorer</li>
                <li>Daily streaks & rewards</li>
                <li>Certificate verification</li>
                <li>College leaderboard</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">For Colleges & Companies</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>T&P Cell dashboard</li>
                <li>Company verification</li>
                <li>Weekly automated summaries</li>
                <li>College-wide analytics</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} InternTracker. Built for campuses, by people who care about internships.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-emerald-400" /> Verified company program</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-indigo-400" /> Role-based security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

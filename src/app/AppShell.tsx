import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/constants";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCheck,
  ClipboardList,
  Compass,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ShieldCheck,
  Timer,
  Trophy,
  User,
  Users,
  LineChart,
  Building2,
  BadgeCheck,
  Search,
  CandlestickChart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

type Role = "student" | "faculty" | "admin" | "company";

const ROLE_META: Record<
  Role,
  { label: string; badge: string; gradient: string }
> = {
  student: {
    label: "Student",
    badge: "bg-indigo-500/15 text-indigo-300",
    gradient: "from-indigo-500 to-sky-400",
  },
  faculty: {
    label: "Faculty",
    badge: "bg-sky-500/15 text-sky-300",
    gradient: "from-sky-500 to-cyan-400",
  },
  admin: {
    label: "T&P Cell",
    badge: "bg-emerald-500/15 text-emerald-300",
    gradient: "from-emerald-500 to-teal-400",
  },
  company: {
    label: "Company",
    badge: "bg-amber-500/15 text-amber-300",
    gradient: "from-amber-500 to-orange-400",
  },
};

interface NavSection {
  label?: string;
  items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }>;
}

const NAV: Record<Role, NavSection[]> = {
  student: [
    {
      items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      label: "Internships",
      items: [
        { to: "/app/internships", label: "Explore Internships", icon: Compass },
        { to: "/app/applications", label: "My Applications", icon: FileText },
        { to: "/app/tracker", label: "My Internship", icon: Briefcase },
      ],
    },
    {
      label: "Tracking",
      items: [
        { to: "/app/reports", label: "Daily & Weekly Reports", icon: ClipboardList },
        { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
        { to: "/app/deadlines", label: "Deadlines", icon: Timer },
      ],
    },
    {
      label: "Achievements",
      items: [
        { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
        { to: "/app/rewards", label: "Rewards & Badges", icon: Gift },
        { to: "/app/certificates", label: "Certificates", icon: ShieldCheck },
      ],
    },
    {
      label: "Account",
      items: [{ to: "/app/profile", label: "My Profile", icon: User }],
    },
  ],
  faculty: [
    {
      items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      items: [
        { to: "/app/students", label: "My Students", icon: Users },
        { to: "/app/reports", label: "Reports Review", icon: ClipboardList },
        { to: "/app/performance", label: "Performance", icon: LineChart },
        { to: "/app/notifications", label: "Notifications", icon: Bell },
      ],
    },
  ],
  admin: [
    {
      items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      label: "Manage",
      items: [
        { to: "/app/students", label: "Students", icon: Users },
        { to: "/app/faculty", label: "Faculty", icon: User },
        { to: "/app/companies", label: "Companies", icon: Building2 },
        { to: "/app/verification", label: "Verification Queue", icon: BadgeCheck },
      ],
    },
    {
      label: "Ecosystem",
      items: [
        { to: "/app/internships", label: "Internships", icon: Briefcase },
        { to: "/app/applications", label: "Applications", icon: FileText },
        { to: "/app/certificates", label: "Certificates", icon: ShieldCheck },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/app/rankings", label: "Rankings", icon: Trophy },
        { to: "/app/rewards", label: "Rewards Config", icon: Gift },
        { to: "/app/analytics", label: "Analytics", icon: LineChart },
        { to: "/app/announcements", label: "Announcements", icon: Megaphone },
      ],
    },
  ],
  company: [
    {
      items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      items: [
        { to: "/app/profile", label: "Company Profile", icon: Building2 },
        { to: "/app/internships", label: "My Internships", icon: Briefcase },
        { to: "/app/applications", label: "Applications", icon: FileText },
        { to: "/app/candidates", label: "Candidates", icon: Search },
        { to: "/app/interns", label: "Current Interns", icon: Users },
        { to: "/app/notifications", label: "Notifications", icon: Bell },
      ],
    },
  ],
};

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-900/40">
        <Sparkles className="size-4" />
      </div>
      <div className="leading-none">
        <p className="text-[15px] font-bold tracking-tight text-white">
          InternTracker
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
          Campus OS
        </p>
      </div>
    </Link>
  );
}

function NotificationBell() {
  const notifications = useQuery(api.notifications.myNotifications);
  const unread = useQuery(api.notifications.unreadCount);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const navigate = useNavigate();

  if (notifications === undefined || unread === undefined) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-indigo-600"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              You're all caught up 🎉
            </p>
          )}
          {notifications.slice(0, 8).map((n) => (
            <button
              key={n._id}
              onClick={() => {
                markAllRead();
                if (n.link) navigate(n.link);
              }}
              className={cn(
                "flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50",
                !n.read && "bg-indigo-50/50",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.read ? "bg-slate-200" : "bg-indigo-500",
                )}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-slate-800">
                  {n.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">
                  {n.message}
                </span>
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {timeAgo(n.createdAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell() {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ensureSeeded = useMutation(api.seed.ensureSystemSeeded);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      ensureSeeded().catch(() => undefined);
    }
  }, [ensureSeeded]);

  useEffect(() => {
    if (!isLoading && user && !user.role) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="animate-pulse text-sm text-slate-400">Loading workspace…</div>
      </main>
    );
  }

  if (!user.role) return null;

  const role = user.role as Role;
  const meta = ROLE_META[role];
  const sections = NAV[role] ?? [];
  const currentSection = sections
    .flatMap((s) => s.items)
    .find((i) =>
      i.end ? location.pathname === i.to : location.pathname.startsWith(i.to),
    );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col bg-slate-900 lg:flex">
        <div className="px-4 pb-2 pt-5">
          <Brand />
        </div>
        <div className="px-4 py-3">
          <Badge className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", meta.badge)}>
            {meta.label}
          </Badge>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-sky-400" />
                        )}
                        <item.icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive
                              ? "text-indigo-300"
                              : "text-slate-500 group-hover:text-slate-300",
                          )}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                meta.gradient,
              )}
            >
              {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {user.name ?? "Account"}
              </p>
              <p className="truncate text-[11px] text-slate-400">{meta.label}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9">
            <LogOut className="size-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="lg:pl-[228px]">
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-slate-200/80 bg-[#f8fafc]/85 px-8 py-3.5 backdrop-blur lg:flex">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {meta.label} Workspace
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {currentSection?.label ?? "Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2 pl-1">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white",
                  meta.gradient,
                )}
              >
                {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-slate-800">
                  {user.name ?? "Account"}
                </p>
                <p className="text-[11px] text-slate-400">{meta.label}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Role gate: renders children only for allowed roles, otherwise a notice. */
export function RoleGate({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;
  if (!user.role || !roles.includes(user.role as Role)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
        <CandlestickChart className="size-8 text-slate-300" />
        <h2 className="mt-4 text-sm font-semibold text-slate-700">
          This area isn't available for your role
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          You're signed in as {user.role}. Access is restricted to authorized
          roles only.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

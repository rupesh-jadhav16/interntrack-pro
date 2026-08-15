import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// App workspace (loaded eagerly — the authenticated experience)
import AppShell, { RoleGate } from "./app/AppShell";
import RoleHome from "./app/role-home";
import NotificationsPage from "./app/notifications-page";

// Student
import StudentInternships from "./app/student/internships";
import StudentApplications from "./app/student/applications";
import StudentTracker from "./app/student/tracker";
import StudentReports from "./app/student/reports";
import StudentAttendance from "./app/student/attendance";
import StudentDeadlines from "./app/student/deadlines";
import StudentLeaderboard from "./app/student/leaderboard";
import StudentRewards from "./app/student/rewards";
import StudentCertificates from "./app/student/certificates";
import StudentProfile from "./app/student/profile";

// Faculty
import FacultyStudents from "./app/faculty/students";
import FacultyReports from "./app/faculty/reports";
import FacultyPerformance from "./app/faculty/performance";

// Admin
import AdminStudents from "./app/admin/students";
import AdminFaculty from "./app/admin/faculty";
import AdminCompanies from "./app/admin/companies";
import AdminVerification from "./app/admin/verification";
import AdminInternships from "./app/admin/internships";
import AdminApplications from "./app/admin/applications";
import AdminCertificates from "./app/admin/certificates";
import AdminRankings from "./app/admin/rankings";
import AdminRewards from "./app/admin/rewards";
import AdminAnalytics from "./app/admin/analytics";
import AdminAnnouncements from "./app/admin/announcements";

// Company
import CompanyProfile from "./app/company/profile";
import CompanyInternships from "./app/company/internships";
import CompanyApplications from "./app/company/applications";
import CompanyCandidates from "./app/company/candidates";
import CompanyInterns from "./app/company/interns";

import { useAuth } from "@/hooks/use-auth";

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

/** Renders a role-specific page for a shared path. If the role has no page
 *  for this path, shows the access-denied state. */
function RoleSwitch({
  student,
  faculty,
  admin,
  company,
}: {
  student?: React.ComponentType;
  faculty?: React.ComponentType;
  admin?: React.ComponentType;
  company?: React.ComponentType;
}) {
  const { user } = useAuth();
  const map: Record<string, React.ComponentType | undefined> = {
    student,
    faculty,
    admin,
    company,
  };
  const Comp = user?.role ? map[user.role] : undefined;
  if (!Comp) {
    return (
      <RoleGate roles={["student", "faculty", "admin", "company"]}>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-400">
          This page isn't part of your role's workspace.
        </div>
      </RoleGate>
    );
  }
  return <Comp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/app" />}
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<RoleHome />} />
                {/* Shared paths, role-aware */}
                <Route
                  path="internships"
                  element={
                    <RoleSwitch
                      student={StudentInternships}
                      admin={AdminInternships}
                      company={CompanyInternships}
                    />
                  }
                />
                <Route
                  path="applications"
                  element={
                    <RoleSwitch
                      student={StudentApplications}
                      admin={AdminApplications}
                      company={CompanyApplications}
                    />
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RoleSwitch
                      student={StudentReports}
                      faculty={FacultyReports}
                    />
                  }
                />
                <Route
                  path="rewards"
                  element={
                    <RoleSwitch student={StudentRewards} admin={AdminRewards} />
                  }
                />
                <Route
                  path="certificates"
                  element={
                    <RoleSwitch
                      student={StudentCertificates}
                      admin={AdminCertificates}
                    />
                  }
                />
                <Route
                  path="profile"
                  element={
                    <RoleSwitch
                      student={StudentProfile}
                      company={CompanyProfile}
                    />
                  }
                />
                <Route
                  path="students"
                  element={
                    <RoleSwitch
                      faculty={FacultyStudents}
                      admin={AdminStudents}
                    />
                  }
                />
                {/* Student-only */}
                <Route
                  path="tracker"
                  element={
                    <RoleGate roles={["student"]}>
                      <StudentTracker />
                    </RoleGate>
                  }
                />
                <Route
                  path="attendance"
                  element={
                    <RoleGate roles={["student"]}>
                      <StudentAttendance />
                    </RoleGate>
                  }
                />
                <Route
                  path="deadlines"
                  element={
                    <RoleGate roles={["student"]}>
                      <StudentDeadlines />
                    </RoleGate>
                  }
                />
                <Route
                  path="leaderboard"
                  element={
                    <RoleGate roles={["student"]}>
                      <StudentLeaderboard />
                    </RoleGate>
                  }
                />
                {/* Faculty-only */}
                <Route
                  path="performance"
                  element={
                    <RoleGate roles={["faculty"]}>
                      <FacultyPerformance />
                    </RoleGate>
                  }
                />
                {/* Admin-only */}
                <Route
                  path="faculty"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminFaculty />
                    </RoleGate>
                  }
                />
                <Route
                  path="companies"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminCompanies />
                    </RoleGate>
                  }
                />
                <Route
                  path="verification"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminVerification />
                    </RoleGate>
                  }
                />
                <Route
                  path="rankings"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminRankings />
                    </RoleGate>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminAnalytics />
                    </RoleGate>
                  }
                />
                <Route
                  path="announcements"
                  element={
                    <RoleGate roles={["admin"]}>
                      <AdminAnnouncements />
                    </RoleGate>
                  }
                />
                {/* Company-only */}
                <Route
                  path="candidates"
                  element={
                    <RoleGate roles={["company"]}>
                      <CompanyCandidates />
                    </RoleGate>
                  }
                />
                <Route
                  path="interns"
                  element={
                    <RoleGate roles={["company"]}>
                      <CompanyInterns />
                    </RoleGate>
                  }
                />
                {/* Everyone */}
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);

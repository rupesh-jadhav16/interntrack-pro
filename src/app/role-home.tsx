import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router";
import StudentDashboard from "./student/dashboard";
import FacultyDashboard from "./faculty/dashboard";
import AdminDashboard from "./admin/dashboard";
import CompanyDashboard from "./company/dashboard";

export default function RoleHome() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user?.role) return <Navigate to="/onboarding" replace />;

  switch (user.role) {
    case "student":
      return <StudentDashboard />;
    case "faculty":
      return <FacultyDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "company":
      return <CompanyDashboard />;
    default:
      return <Navigate to="/onboarding" replace />;
  }
}

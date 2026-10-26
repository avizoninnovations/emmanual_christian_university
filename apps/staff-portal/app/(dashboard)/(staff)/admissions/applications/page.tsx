import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { AdmissionsApplicationsView } from "@/modules/admissions/ui/views/admissions-applications-view";

export default function AdmissionsApplicationsPage() {
  return <AdminGuard allowedRoles={["registrar", "admissions_officer"]}><AdmissionsApplicationsView /></AdminGuard>;
}

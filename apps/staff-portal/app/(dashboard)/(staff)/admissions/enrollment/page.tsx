import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { AdmissionsEnrollmentView } from "@/modules/admissions/ui/views/admissions-enrollment-view";

export default function AdmissionsEnrollmentPage() {
  return <AdminGuard allowedRoles={["registrar", "admissions_officer"]}><AdmissionsEnrollmentView /></AdminGuard>;
}

"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { AdmissionsDashboardView } from "@/modules/dashboard/ui/views/admissions-dashboard-view";

export default function StaffAdmissionsPage() {
  return (
    <AdminGuard allowedRoles={["registrar", "admissions_officer"]}>
      <AdmissionsDashboardView />
    </AdminGuard>
  );
}

"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { AdmissionsView } from "@/modules/admissions/ui/views/admissions-view";

export default function StaffAdmissionsPage() {
  return (
    <AdminGuard allowedRoles={["registrar", "admissions_officer"]}>
      <AdmissionsView />
    </AdminGuard>
  );
}

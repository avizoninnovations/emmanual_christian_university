"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { StaffManagementView } from "@/modules/staff/ui/views/staff-management-view";

export default function AdminStaffPage() {
  return (
    <AdminGuard>
      <StaffManagementView />
    </AdminGuard>
  );
}

"use client";

import { StaffListManager } from "@/modules/staff/ui/components/staff-list-manager";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { Users2 } from "lucide-react";

export default function InactiveStaffPage() {
  return (
    <AdminGuard>
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                <Users2 className="size-6" />
            </div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Inactive Personnel</h1>
                <p className="text-muted-foreground text-sm">Manage deactivated or former university staff members.</p>
            </div>
        </div>
        <StaffListManager statusFilter="inactive" />
      </div>
    </AdminGuard>
  );
}

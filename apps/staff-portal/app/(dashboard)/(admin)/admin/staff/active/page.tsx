"use client";

import { StaffListManager } from "@/modules/staff/ui/components/staff-list-manager";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { Users } from "lucide-react";

export default function ActiveStaffPage() {
  return (
    <AdminGuard>
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Users className="size-6" />
            </div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Active Personnel</h1>
                <p className="text-muted-foreground text-sm">Review and manage currently active university staff.</p>
            </div>
        </div>
        <StaffListManager statusFilter="active" />
      </div>
    </AdminGuard>
  );
}

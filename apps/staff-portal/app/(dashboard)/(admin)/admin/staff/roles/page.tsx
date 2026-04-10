"use client";

import { RolesManager } from "@/modules/staff/ui/components/roles-manager";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { Shield } from "lucide-react";

export default function StaffRolesPage() {
  return (
    <AdminGuard>
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Shield className="size-6" />
            </div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">System-Wide Roles</h1>
                <p className="text-muted-foreground text-sm">Define and manage dynamic administrative roles for staff members.</p>
            </div>
        </div>
        <RolesManager />
      </div>
    </AdminGuard>
  );
}

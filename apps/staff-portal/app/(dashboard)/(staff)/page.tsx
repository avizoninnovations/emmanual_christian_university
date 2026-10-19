"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RoleSelector } from "@/modules/dashboard/ui/components/role-selector";
import StaffDashboardView from "@/modules/dashboard/ui/views/staff-dashboard-view";

export default function StaffDashboardPage() {
  const { activeRole, needsRoleSelection, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && activeRole === "admin") router.replace("/admin");
  }, [activeRole, isLoading, router]);

  if (isLoading || activeRole === "admin" || (!activeRole && !needsRoleSelection)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading your workspace…</div>;
  }
  if (needsRoleSelection) return <RoleSelector />;

  return <StaffDashboardView />;
}

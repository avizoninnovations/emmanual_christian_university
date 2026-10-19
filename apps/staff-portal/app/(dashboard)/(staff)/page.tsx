"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RoleSelector } from "@/modules/dashboard/ui/components/role-selector";
import StaffDashboardView from "@/modules/dashboard/ui/views/staff-dashboard-view";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default function StaffDashboardPage() {
  const { activeRole, needsRoleSelection, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && activeRole === "admin") router.replace("/admin");
  }, [activeRole, isLoading, router]);

  if (isLoading || activeRole === "admin" || (!activeRole && !needsRoleSelection)) {
    return (
      <div className="min-h-full bg-transparent p-4 md:p-6" role="status" aria-label="Loading workspace">
        <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(310px,0.92fr)]">
          <div className="space-y-4"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-56 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>
          <div className="space-y-4"><Skeleton className="h-40 rounded-lg" /><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-36 rounded-lg" /></div>
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (needsRoleSelection) return <RoleSelector />;

  return <StaffDashboardView />;
}

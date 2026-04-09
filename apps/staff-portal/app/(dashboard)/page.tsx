"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { RoleSelector } from "@/modules/dashboard/ui/components/role-selector";
import { redirect, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Root dashboard page — acts as a router based on the user's active role.
 * - Multi-role users with no selection → Role Selector
 * - Admin role → redirect to /admin
 * - Staff role → redirect to /staff
 */
export default function DashboardPage() {
  const { activeRole, needsRoleSelection, isLoading } = useCurrentUser();

  const router = useRouter();

  // Redirect based on active role
  useEffect(() => {
    if (!isLoading && activeRole === "admin") {
      router.push("/admin");
    } else if (!isLoading && activeRole === "staff") {
      router.push("/staff");
    }
  }, [activeRole, isLoading, router]);

  // Show loading while determining role
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading your workspace...</span>
        </div>
      </div>
    );
  }

  // Multi-role user needs to pick
  if (needsRoleSelection) {
    return <RoleSelector />;
  }

  // While redirecting, show a brief loading state
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Preparing dashboard...</span>
      </div>
    </div>
  );
}

"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminSidebar } from "./admin-sidebar";
import { StaffSidebar } from "./staff-sidebar";

/**
 * Switcher component that renders the appropriate sidebar
 * based on the user's active role.
 */
export const DashboardSidebar = () => {
  const { activeRole } = useCurrentUser();

  if (activeRole === "admin") {
    return <AdminSidebar />;
  }

  return <StaffSidebar />;
};

"use client";

import { AuthGuard } from "@/modules/auth/ui/components/auth-guard";

import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { Provider } from "jotai";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DashboardSidebar } from "../components/dashboard-sidebar";

/**
 * Dashboard layout that wraps all authenticated pages.
 * 
 * When a multi-role user hasn't selected their active role yet,
 * we render children without the sidebar (so the RoleSelector gets
 * the full screen). Once a role is selected, the sidebar appears.
 */
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard>
      <Provider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </Provider>
    </AuthGuard>
  );
};

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { needsRoleSelection, isLoading, activeRole } = useCurrentUser();

  // While loading or if the user needs to select a role,
  // render without sidebar so the RoleSelector gets full screen
  if (isLoading || needsRoleSelection) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </SidebarProvider>
  );
}

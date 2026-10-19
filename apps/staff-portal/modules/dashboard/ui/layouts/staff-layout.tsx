"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { SidebarProvider } from "@workspace/ui/components/sidebar";

export const StaffLayout = ({ children, defaultOpen }: { children: React.ReactNode; defaultOpen: boolean }) => {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      <StaffSidebar />
      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-muted/35">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
};

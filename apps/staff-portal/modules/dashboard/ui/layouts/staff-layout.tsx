"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { SidebarProvider } from "@workspace/ui/components/sidebar";

export const StaffLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <StaffSidebar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </SidebarProvider>
  );
};

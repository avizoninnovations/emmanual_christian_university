"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { StaffRouteBreadcrumbs } from "@/modules/dashboard/ui/components/staff-route-breadcrumbs";
import { ResizableSidebarProvider } from "@/modules/dashboard/ui/components/resizable-sidebar-provider";

export const StaffLayout = ({ children, defaultOpen }: { children: React.ReactNode; defaultOpen: boolean }) => {
  return (
    <ResizableSidebarProvider
      defaultOpen={defaultOpen}
      defaultWidth={256}
      iconWidth="3.5rem"
      className="h-dvh min-h-0 overflow-hidden"
    >
      <StaffSidebar />
      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-muted/35">
        <StaffRouteBreadcrumbs />
        <div className="portal-content-area min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
      </main>
    </ResizableSidebarProvider>
  );
};

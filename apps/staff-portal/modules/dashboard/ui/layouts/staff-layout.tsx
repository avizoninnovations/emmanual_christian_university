"use client";

import { StaffSidebar } from "@/modules/dashboard/ui/components/staff-sidebar";
import { ResizableSidebarProvider } from "@/modules/dashboard/ui/components/resizable-sidebar-provider";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

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
        <div className="flex h-11 shrink-0 items-center px-3 md:hidden">
          <SidebarTrigger
            aria-label="Toggle navigation menu"
            className="size-9 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
          />
        </div>
        <div className="portal-content-area min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
      </main>
    </ResizableSidebarProvider>
  );
};

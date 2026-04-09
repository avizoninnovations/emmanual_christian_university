"use client";

import { AdminSidebar } from "@/modules/dashboard/ui/components/admin-sidebar";
import { SidebarProvider } from "@workspace/ui/components/sidebar";

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </SidebarProvider>
  );
};

"use client";

import { AdminSidebar } from "@/modules/dashboard/ui/components/admin-sidebar";
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar";
import Image from "next/image";

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="p-2 md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex-1 overflow-y-auto w-full relative">
          {/* ── Background Watermark ── */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="ECU Watermark" 
              fill 
              loading="eager"
              className="grayscale" 
            />
          </div>
          
          <div className="relative z-10 w-full min-h-full">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

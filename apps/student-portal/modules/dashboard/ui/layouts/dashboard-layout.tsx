import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { ResizableSidebarProvider } from "@workspace/ui/components/resizable-sidebar-provider";
import { Provider } from "jotai";
import { cookies } from "next/headers";
import { DashboardTopbar } from "@/modules/dashboard/ui/components/dashboard-topbar";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  // Using SIDEBAR_COOKIE_NAME from sidebar component does not work due to monorepo and SSR
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AuthGuard>
      <Provider>
        <ResizableSidebarProvider
          defaultWidth={256}
          defaultOpen={defaultOpen}
          className="student-portal-theme"
          iconWidth="6rem"
          storageKey="ecu-student-sidebar-width"
        >
          <DashboardSidebar />
          <main className="portal-content-area flex min-h-screen flex-1 flex-col bg-muted/40">
            <DashboardTopbar />
            {children}
          </main>
        </ResizableSidebarProvider>
      </Provider>
    </AuthGuard>
  );
};

import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { Provider } from "jotai";
import { cookies } from "next/headers";
import { DashboardTopbar } from "@/modules/dashboard/ui/components/dashboard-topbar";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  // Using SIDEBAR_COOKIE_NAME from sidebar component does not work due to monorepo and SSR
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <AuthGuard>
      <Provider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <DashboardSidebar />
          <main className="flex min-h-screen flex-1 flex-col bg-[#f1f3f8]">
            <DashboardTopbar />
            {children}
          </main>
        </SidebarProvider>
      </Provider>
    </AuthGuard>
  );
};

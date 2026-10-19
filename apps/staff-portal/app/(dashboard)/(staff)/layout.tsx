import { StaffLayout } from "@/modules/dashboard/ui/layouts/staff-layout";
import { cookies } from "next/headers";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <StaffLayout defaultOpen={defaultOpen}>
      {children}
    </StaffLayout>
  );
}

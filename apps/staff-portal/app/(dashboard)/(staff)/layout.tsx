import { StaffLayout } from "@/modules/dashboard/ui/layouts/staff-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <StaffLayout>
      {children}
    </StaffLayout>
  );
}

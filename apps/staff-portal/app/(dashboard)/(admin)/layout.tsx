import { AdminLayout } from "@/modules/dashboard/ui/layouts/admin-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { GuestOnlyGuard } from "@/modules/auth/ui/components/guest-only-guard";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return ( 
    <AuthLayout>
      <GuestOnlyGuard>{children}</GuestOnlyGuard>
    </AuthLayout>
  );
}
 
export default Layout;

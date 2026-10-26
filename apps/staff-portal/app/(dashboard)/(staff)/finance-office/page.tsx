import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { FinanceOfficeSectionView } from "@/modules/finance/ui/views/finance-office-section-view";

export default function FinanceOfficeOverviewPage() {
  return <AdminGuard allowedRoles={["finance", "bursar", "cashier"]}><FinanceOfficeSectionView section="overview" /></AdminGuard>;
}

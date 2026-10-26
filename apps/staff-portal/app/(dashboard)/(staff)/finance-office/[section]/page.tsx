import { notFound } from "next/navigation";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { FinanceOfficeSectionView } from "@/modules/finance/ui/views/finance-office-section-view";
import type { FinanceOfficeSection } from "@/modules/finance/ui/views/finance-view";

const financeSections: Record<string, FinanceOfficeSection> = {
  accounts: "accounts",
  payments: "payments",
  fees: "fees",
  sponsors: "sponsors",
  reconciliation: "reconciliation",
  reports: "reports",
  payroll: "payroll",
};

const managementSections = new Set(["fees", "sponsors", "reports", "payroll"]);

export default async function FinanceOfficeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const target = financeSections[section];
  if (!target) notFound();
  const allowedRoles = managementSections.has(section)
    ? ["finance", "bursar"]
    : ["finance", "bursar", "cashier"];
  return <AdminGuard allowedRoles={allowedRoles}><FinanceOfficeSectionView section={target} /></AdminGuard>;
}

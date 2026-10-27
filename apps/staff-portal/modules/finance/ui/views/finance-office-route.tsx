"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import type { FinanceOfficeSection } from "./finance-view";
import { FinanceOfficeSectionView } from "./finance-office-section-view";

const managementSections = new Set<FinanceOfficeSection>([
  "fees",
  "sponsors",
  "reports",
  "payroll",
]);

export function FinanceOfficeRoute({ section }: { section: FinanceOfficeSection }) {
  const allowedRoles = managementSections.has(section)
    ? ["finance", "bursar"]
    : ["finance", "bursar", "cashier"];

  return (
    <AdminGuard allowedRoles={allowedRoles}>
      <FinanceOfficeSectionView section={section} />
    </AdminGuard>
  );
}

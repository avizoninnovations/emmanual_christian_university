"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { FinanceView } from "@/modules/finance/ui/views/finance-view";

export default function FinancePage() {
  return (
    <AdminGuard>
      <FinanceView />
    </AdminGuard>
  );
}

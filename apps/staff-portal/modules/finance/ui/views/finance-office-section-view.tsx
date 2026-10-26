import type { FinanceOfficeSection } from "./finance-view";
import { FinanceView } from "./finance-view";
import { FinanceReportsView } from "./finance-reports-view";
import { FinancePayrollView } from "./finance-payroll-view";

export function FinanceOfficeSectionView({ section }: { section: FinanceOfficeSection }) {
  if (section === "reports") return <FinanceReportsView />;
  if (section === "payroll") return <FinancePayrollView />;
  return <FinanceView section={section} />;
}

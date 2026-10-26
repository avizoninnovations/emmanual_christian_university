import type { FinanceOfficeSection } from "./finance-view";
import { FinanceView } from "./finance-view";
import { FinanceReportsView } from "./finance-reports-view";

export function FinanceOfficeSectionView({ section }: { section: FinanceOfficeSection }) {
  if (section === "reports") return <FinanceReportsView />;
  return <FinanceView section={section} />;
}

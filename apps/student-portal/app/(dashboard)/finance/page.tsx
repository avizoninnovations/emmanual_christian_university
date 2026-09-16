import { StudentFinanceView } from "@/modules/finance/ui/views/student-finance-view";

export const metadata = {
  title: "Fee Statements & Receipts | ECU Student Portal",
  description: "View university tuition statements, balance clearance, and payment receipts.",
};

export default function FinancePage() {
  return <StudentFinanceView />;
}

import { notFound } from "next/navigation";
import { AggregatedUnitsView } from "@/modules/aggregated-units/ui/views/aggregated-units-view";
import { AssessmentApplicationsView } from "@/modules/assessment-applications/ui/views/assessment-applications-view";
import { RetakeApprovalsView } from "@/modules/retake-approvals/ui/views/retake-approvals-view";
import { StaffServiceRequestView } from "@/modules/staff-services/ui/views/staff-service-request-view";
import { LeaveCalendarView } from "@/modules/staff-services/ui/views/leave-calendar-view";
import { PerformanceReviewView } from "@/modules/staff-services/ui/views/performance-review-view";
import { SupervisorFeedbackView } from "@/modules/staff-services/ui/views/supervisor-feedback-view";
import { DefenseCasesView } from "@/modules/staff-services/ui/views/defense-cases-view";
import { StaffFinanceView } from "@/modules/staff-payroll/ui/views/staff-finance-view";
import { SalaryPayslipView } from "@/modules/staff-payroll/ui/views/salary-payslip-view";

export function StaffWorkspaceView({ workspace }: { workspace: string }) {
  if (workspace === "aggregated-units") return <AggregatedUnitsView />;
  if (workspace === "aegrotat-units") return <AssessmentApplicationsView />;
  if (workspace === "retake-approvals") return <RetakeApprovalsView />;
  if (workspace === "my-evaluation") return <PerformanceReviewView />;
  if (workspace === "supervisor-evaluation") return <SupervisorFeedbackView />;
  if (workspace === "leave-application")
    return <StaffServiceRequestView type="leave" />;
  if (workspace === "exit-application")
    return <StaffServiceRequestView type="exit" />;
  if (workspace === "complaints")
    return <StaffServiceRequestView type="complaint" />;
  if (workspace === "leave-calendar") return <LeaveCalendarView />;
  if (workspace === "defenses") return <DefenseCasesView />;
  if (workspace === "finance") return <StaffFinanceView />;
  if (workspace === "salary-payslip") return <SalaryPayslipView />;
  notFound();
}

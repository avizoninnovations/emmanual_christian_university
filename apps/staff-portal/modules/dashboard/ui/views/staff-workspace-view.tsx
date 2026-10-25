import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { staffWorkspaces } from "./staff-workspace-content";
import { AggregatedUnitsView } from "@/modules/aggregated-units/ui/views/aggregated-units-view";
import { AssessmentApplicationsView } from "@/modules/assessment-applications/ui/views/assessment-applications-view";
import { RetakeApprovalsView } from "@/modules/retake-approvals/ui/views/retake-approvals-view";
import { StaffServiceRequestView } from "@/modules/staff-services/ui/views/staff-service-request-view";
import { LeaveCalendarView } from "@/modules/staff-services/ui/views/leave-calendar-view";
import { PerformanceReviewView } from "@/modules/staff-services/ui/views/performance-review-view";
import { SupervisorFeedbackView } from "@/modules/staff-services/ui/views/supervisor-feedback-view";
import { DefenseCasesView } from "@/modules/staff-services/ui/views/defense-cases-view";

export function StaffWorkspaceView({ workspace }: { workspace: string }) {
  if (workspace === "aggregated-units") return <AggregatedUnitsView />;
  if (workspace === "aegrotat-units") return <AssessmentApplicationsView />;
  if (workspace === "retake-approvals") return <RetakeApprovalsView />;
  if (workspace === "my-evaluation") return <PerformanceReviewView />;
  if (workspace === "supervisor-evaluation") return <SupervisorFeedbackView />;
  if (workspace === "leave-application") return <StaffServiceRequestView type="leave" />;
  if (workspace === "exit-application") return <StaffServiceRequestView type="exit" />;
  if (workspace === "complaints") return <StaffServiceRequestView type="complaint" />;
  if (workspace === "leave-calendar") return <LeaveCalendarView />;
  if (workspace === "defenses") return <DefenseCasesView />;
  const page = staffWorkspaces[workspace];
  if (!page) notFound();

  return <main className="min-h-full min-w-0 space-y-5 p-3 md:p-5">
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      {page.sections.map((section) => <Card key={section.title} className="min-w-0 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" /></span>
            <CardTitle className="min-w-0 text-base">{section.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {section.fields.map((field) => <Badge key={field} variant="outline" className="rounded-md px-2.5 py-1 font-normal">{field}</Badge>)}
        </CardContent>
      </Card>)}
    </div>
  </main>;
}

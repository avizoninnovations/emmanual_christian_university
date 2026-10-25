import type { FunctionReturnType } from "convex/server";
import { Eye } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

export type AggregationRequest = FunctionReturnType<typeof api.courseUnitAggregations.lecturerRequests>["page"][number];

export function AggregationRequestTable({ requests, onSelect, loading }: {
  requests: AggregationRequest[]; onSelect: (request: AggregationRequest) => void; loading?: boolean;
}) {
  return <div className="w-full overflow-x-auto">
    <Table>
      <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5">
        <TableHead className="w-14 text-center">#</TableHead><TableHead>Student</TableHead><TableHead>Course unit</TableHead>
        <TableHead>Academic Period</TableHead><TableHead>Program / year</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {requests.map((request, index) => <TableRow key={request._id}>
          <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="min-w-48"><span className="block font-medium">{request.studentName}</span><span className="font-mono text-xs text-muted-foreground">{request.registrationNumber}</span></TableCell>
          <TableCell className="min-w-48"><span className="block font-medium">{request.courseTitle}</span><span className="font-mono text-xs text-muted-foreground">{request.courseCode} · {request.creditUnits} CU</span></TableCell>
          <TableCell className="min-w-36">{request.periodName}</TableCell>
          <TableCell className="min-w-52"><span className="block">Student: {request.programName}, Y{request.studentYear}</span><span className="block text-xs text-muted-foreground">Course: {request.courseProgramName}, Y{request.courseYear}/S{request.courseSemester}</span><span className="block text-xs text-muted-foreground">{request.status === "pending_hod" ? `Load ${request.creditLoadCapped ? "100+" : request.currentCreditUnits} → ${request.creditLoadCapped ? "verify" : request.currentCreditUnits + request.creditUnits} CU` : `Current load ${request.creditLoadCapped ? "100+" : request.currentCreditUnits} CU`}</span></TableCell>
          <TableCell><RequestStatus status={request.status} /></TableCell>
          <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 rounded-sm text-primary" onClick={() => onSelect(request)}><Eye className="mr-1.5 size-4" />Details</Button></TableCell>
        </TableRow>)}
        {!loading && requests.length === 0 && <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">No aggregation requests in this view.</TableCell></TableRow>}
      </TableBody>
    </Table>
  </div>;
}

export function RequestStatus({ status }: { status: AggregationRequest["status"] }) {
  const color = status === "approved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : status === "rejected" ? "bg-destructive/10 text-destructive"
    : status === "pending_hod" ? "bg-primary/10 text-primary"
    : status === "withdrawn" ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  const label: Record<AggregationRequest["status"], string> = {
    pending_lecturer: "With lecturer", pending_hod: "With HOD", approved: "Approved", rejected: "Declined", withdrawn: "Withdrawn",
  };
  return <Badge variant="secondary" className={`rounded-sm font-medium ${color}`}>{label[status]}</Badge>;
}

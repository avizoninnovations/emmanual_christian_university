"use client";

import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

const statusLabels: Record<Doc<"staffServiceRequests">["status"], string> = {
  draft: "Draft", submitted: "Submitted", supervisor_review: "Supervisor review", hr_review: "HR review",
  returned: "Returned", approved: "Approved", rejected: "Declined", withdrawn: "Withdrawn",
  completed: "Completed", response_due: "Response due", response_submitted: "Response submitted",
};

export function StaffServiceRequestList({ rows, onDetails, isLoading, emptyLabel }: {
  rows: Doc<"staffServiceRequests">[];
  onDetails: (row: Doc<"staffServiceRequests">) => void;
  isLoading: boolean;
  emptyLabel: string;
}) {
  return <div className="w-full overflow-x-auto">
    <Table>
      <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-12">#</TableHead><TableHead>Request</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((row, index) => <TableRow key={row._id}>
          <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
          <TableCell className="min-w-56"><span className="block font-medium">{row.subject}</span><span className="text-xs capitalize text-muted-foreground">{row.type === "exit" ? "Exit application" : row.type}</span></TableCell>
          <TableCell>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—"}</TableCell>
          <TableCell><Badge variant="outline" className="rounded-sm">{statusLabels[row.status]}</Badge></TableCell>
          <TableCell className="text-right"><Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={() => onDetails(row)}>Details</Button></TableCell>
        </TableRow>)}
        {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">{emptyLabel}</TableCell></TableRow>}
        {isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">Loading requests…</TableCell></TableRow>}
      </TableBody>
    </Table>
  </div>;
}

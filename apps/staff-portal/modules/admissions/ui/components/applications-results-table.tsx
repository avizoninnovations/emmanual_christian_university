"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";

export type ApplicantRow = Doc<"applicants"> & { programName: string };

export function ApplicationsResultsTable({ rows, selectableIds, selectedIds, loading, canLoadMore, onToggle, onToggleVisible, onReview, onLoadMore }: {
  rows: ApplicantRow[];
  selectableIds: Id<"applicants">[];
  selectedIds: Set<Id<"applicants">>;
  loading: boolean;
  canLoadMore: boolean;
  onToggle: (id: Id<"applicants">, checked: boolean | "indeterminate") => void;
  onToggleVisible: (checked: boolean | "indeterminate") => void;
  onReview: (id: Id<"applicants">) => void;
  onLoadMore: () => void;
}) {
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = selectableIds.some((id) => selectedIds.has(id));

  return <>
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"><Checkbox aria-label="Select all actionable applications in this view" checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false} onCheckedChange={onToggleVisible} /></TableHead>
            <TableHead className="w-12">#</TableHead><TableHead>Applicant</TableHead><TableHead>Program</TableHead><TableHead>Intake</TableHead><TableHead>Applied</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && Array.from({ length: 5 }, (_, index) => <TableRow key={index}><TableCell colSpan={8}><Skeleton className="h-7 w-full" /></TableCell></TableRow>)}
          {rows.map((applicant, index) => <TableRow key={applicant._id}>
            <TableCell><Checkbox aria-label={`Select ${applicant.name}`} checked={selectedIds.has(applicant._id)} disabled={!selectableIds.includes(applicant._id)} onCheckedChange={(checked) => onToggle(applicant._id, checked)} /></TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="min-w-52"><span className="block font-medium">{applicant.name}</span><span className="text-xs text-muted-foreground">{applicant.applicationNumber ?? "Reference pending"} · {applicant.email}</span></TableCell>
            <TableCell className="min-w-40">{applicant.programName}</TableCell>
            <TableCell>{applicant.term}/{applicant.year}</TableCell>
            <TableCell>{new Date(applicant.applicationDate).toLocaleDateString("en-GB", { dateStyle: "medium" })}</TableCell>
            <TableCell><StageBadge status={applicant.status} /></TableCell>
            <TableCell className="text-right"><Button variant="ghost" size="sm" className="rounded-sm text-primary" onClick={() => onReview(applicant._id)}>Review</Button></TableCell>
          </TableRow>)}
          {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="h-28 text-center text-sm text-muted-foreground">No applications match this view.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
    {canLoadMore && <div className="flex justify-center"><Button variant="outline" className="rounded-sm" onClick={onLoadMore}>Load more applications</Button></div>}
  </>;
}

function StageBadge({ status }: { status: string }) {
  const variant = status === "accepted" || status === "enrolled" ? "secondary" : status === "rejected" ? "destructive" : "outline";
  return <Badge variant={variant} className="rounded-sm capitalize">{status.replaceAll("_", " ")}</Badge>;
}

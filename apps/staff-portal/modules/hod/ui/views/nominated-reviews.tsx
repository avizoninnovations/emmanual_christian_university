"use client";

import { usePaginatedQuery } from "convex/react";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

export function NominatedReviews({ onOpen }: { onOpen: (courseId: Id<"courses">, periodId: Id<"academicPeriods">) => void }) {
  const queue = usePaginatedQuery(api.hod.reviewAssignments, {}, { initialNumItems: 20 });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span>
        <div>
          <h2 className="text-sm font-semibold">Independent review assignments</h2>
          <p className="mt-1 text-xs text-muted-foreground">Classes assigned to you to review marks independently, so lecturers do not approve their own marks.</p>
        </div>
      </div>
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Course unit</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.status === "LoadingFirstPage" ? (
                <TableRow><TableCell colSpan={4}><Skeleton className="h-14" /></TableCell></TableRow>
              ) : queue.results.length ? queue.results.map(row => (
                <TableRow key={row._id} className="hover:bg-muted/25">
                  <TableCell className="py-3 pl-5">
                    <span className="block font-medium">{row.courseTitle}</span>
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">{row.courseCode}</span>
                  </TableCell>
                  <TableCell className="py-3">{row.periodName}</TableCell>
                  <TableCell className="py-3">
                    <Badge variant={row.hasSubmitted ? "secondary" : "outline"} className={row.hasSubmitted ? "rounded-sm bg-primary/10 text-primary" : "rounded-sm"}>
                      {row.hasSubmitted ? "Awaiting your review" : "No submitted marks"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 pr-5 text-right">
                    <Button size="sm" variant={row.hasSubmitted ? "default" : "ghost"} className="rounded-sm" onClick={() => onOpen(row.courseId, row.periodId)}>
                      {row.hasSubmitted ? "Review marks" : "Open class"}<ClipboardCheck className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  No independent review classes have been assigned to you.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
      {queue.status === "CanLoadMore" && <div className="flex justify-center pt-3"><Button variant="outline" size="sm" className="rounded-sm" onClick={() => queue.loadMore(20)}>Load more assignments</Button></div>}
    </div>
  );
}

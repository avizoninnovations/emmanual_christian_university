"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";

export function AcademicActivityView() {
  const scope = useHodScope();
  const activity = usePaginatedQuery(
    api.hod.activity,
    scope.departmentId ? { departmentId: scope.departmentId } : "skip",
    { initialNumItems: 30 },
  );

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <HodScopePicker scope={scope} />
      <div className="overflow-x-auto rounded-sm border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Staff member</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course unit</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activity.status === "LoadingFirstPage" && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-24 w-full" />
                </TableCell>
              </TableRow>
            )}
            {activity.results.map(event => (
              <TableRow key={event._id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleString("en-GB")}
                </TableCell>
                <TableCell className="font-medium">{event.actorName}</TableCell>
                <TableCell>{event.action.replaceAll("_", " ")}</TableCell>
                <TableCell>{event.studentLabel}</TableCell>
                <TableCell>{event.courseLabel}</TableCell>
                <TableCell>{event.periodLabel}</TableCell>
                <TableCell className="min-w-64 whitespace-normal">{event.details}</TableCell>
              </TableRow>
            ))}
            {activity.status !== "LoadingFirstPage" && activity.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No academic activity has been recorded for this department yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {activity.status === "CanLoadMore" && (
          <Button variant="outline" className="m-3" onClick={() => activity.loadMore(30)}>
            Load older activity
          </Button>
        )}
      </div>
    </div>
  );
}

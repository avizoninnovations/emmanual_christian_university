"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { Download, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ApplicantDetailsSheet } from "./applicant-details-sheet";

const filters = [
  { value: "all", label: "All applications" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "In review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Declined" },
  { value: "enrolled", label: "Enrolled" },
] as const;
type StatusFilter = (typeof filters)[number]["value"];
type ApplicantId = Id<"applicants">;

export function ApplicationsPipeline() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApplicantId | null>(null);
  const applicants = usePaginatedQuery(
    api.admissions.getApplicants,
    status === "all" ? {} : { status },
    { initialNumItems: 25 },
  );
  const searchValue = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      applicants.results.filter(
        (applicant) =>
          !searchValue ||
          [
            applicant.name,
            applicant.email,
            applicant.applicationNumber ?? "",
            applicant.programName,
          ].some((value) => value.toLowerCase().includes(searchValue)),
      ),
    [applicants.results, searchValue],
  );

  function exportPage() {
    const csv = [
      "Application,Name,Email,Program,Intake,Status",
      ...rows.map((row) =>
        [
          row.applicationNumber ?? row._id,
          row.name,
          row.email,
          row.programName,
          `${row.term}/${row.year}`,
          row.status,
        ]
          .map(csvValue)
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ecu-admissions-${status}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as StatusFilter)}
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {filters.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
              {status === filter.value && (
                <Badge
                  variant="secondary"
                  className="ml-2 rounded-sm px-1.5 py-0 text-xs"
                >
                  {applicants.results.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {filters.map((filter) => (
          <TabsContent
            key={filter.value}
            value={filter.value}
            className="mt-4 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, application number, or program"
                  className="rounded-sm pl-9"
                />
              </div>
              <Button
                variant="outline"
                className="rounded-sm"
                onClick={exportPage}
                disabled={!rows.length}
              >
                <Download className="mr-2 size-4" />
                Export loaded rows
              </Button>
            </div>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5 hover:bg-primary/5">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicants.status === "LoadingFirstPage" &&
                    Array.from({ length: 5 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {rows.map((applicant, index) => (
                    <TableRow key={applicant._id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="min-w-52">
                        <span className="block font-medium">
                          {applicant.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {applicant.applicationNumber ?? "Reference pending"} ·{" "}
                          {applicant.email}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-40">
                        {applicant.programName}
                      </TableCell>
                      <TableCell>
                        {applicant.term}/{applicant.year}
                      </TableCell>
                      <TableCell>
                        {new Date(applicant.applicationDate).toLocaleDateString(
                          "en-GB",
                          { dateStyle: "medium" },
                        )}
                      </TableCell>
                      <TableCell>
                        <StageBadge status={applicant.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-sm text-primary"
                          onClick={() => setSelected(applicant._id)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {applicants.status !== "LoadingFirstPage" &&
                    rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-28 text-center text-sm text-muted-foreground"
                        >
                          No applications match this view.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
            {applicants.status === "CanLoadMore" && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-sm"
                  onClick={() => applicants.loadMore(25)}
                >
                  Load more applications
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <ApplicantDetailsSheet
        applicantId={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function StageBadge({ status }: { status: string }) {
  const variant =
    status === "accepted" || status === "enrolled"
      ? "secondary"
      : status === "rejected"
        ? "destructive"
        : "outline";
  return (
    <Badge variant={variant} className="rounded-sm capitalize">
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

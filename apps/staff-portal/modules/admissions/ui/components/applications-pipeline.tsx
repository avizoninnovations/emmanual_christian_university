"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Download, Search } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { ApplicationsResultsTable } from "./applications-results-table";
import { toast } from "sonner";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@workspace/ui/components/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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
  const [periodId, setPeriodId] = useState<Id<"academicPeriods"> | null>(null);
  const [periodInitialized, setPeriodInitialized] = useState(false);
  const [programId, setProgramId] = useState<Id<"programs"> | null>(null);
  const [search, setSearch] = useState("");
  const [selectedApplicantId, setSelectedApplicantId] = useState<ApplicantId | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<ApplicantId>>(new Set());
  const [confirmBulkAccept, setConfirmBulkAccept] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const periods = useQuery(api.admissionsEnrollment.getEnrollmentPeriods, {});
  const programs = useQuery(api.academic.getPrograms, {});
  const bulkUpdateStatus = useMutation(api.admissionsBulk.bulkUpdateApplicantStatus);
  useEffect(() => {
    if (periods === undefined || periodInitialized) return;
    const activePeriod = periods.find((period) => period.status === "active");
    setPeriodId(activePeriod?._id ?? null);
    setPeriodInitialized(true);
  }, [periodInitialized, periods]);
  const applicants = usePaginatedQuery(
    api.admissions.getApplicants,
    periodInitialized ? {
      ...(status === "all" ? {} : { status }),
      ...(periodId ? { periodId } : {}),
      ...(programId ? { programId } : {}),
    } : "skip",
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
  const selectableRows = rows.filter((applicant) => applicant.status === "new" || applicant.status === "reviewing");
  const selectedNewCount = applicants.results.filter((row) => selectedIds.has(row._id) && row.status === "new").length;
  const selectedActionableCount = applicants.results.filter((row) => selectedIds.has(row._id) && (row.status === "new" || row.status === "reviewing")).length;

  function toggleApplicant(id: ApplicantId, checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked === true) {
        if (!next.has(id) && next.size >= 100) {
          toast.error("Bulk actions are limited to 100 applications at a time.");
          return current;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function runBulkStatus(nextStatus: "reviewing" | "accepted") {
    const applicableIds = applicants.results
      .filter((row) => selectedIds.has(row._id) && (nextStatus === "reviewing" ? row.status === "new" : row.status === "new" || row.status === "reviewing"))
      .map((row) => row._id);
    if (!applicableIds.length) return;
    setBulkBusy(true);
    try {
      const result = await bulkUpdateStatus({ ids: applicableIds, status: nextStatus });
      toast.success(`${result.updatedCount} application${result.updatedCount === 1 ? "" : "s"} moved to ${nextStatus}${result.skippedCount ? ` · ${result.skippedCount} skipped` : ""}.`);
      setSelectedIds(new Set());
      setConfirmBulkAccept(false);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Could not update the selected applications."));
    } finally {
      setBulkBusy(false);
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleVisible(checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked === true) {
        for (const row of selectableRows) {
          if (next.size >= 100) break;
          next.add(row._id);
        }
      } else {
        selectableRows.forEach((row) => next.delete(row._id));
      }
      return next;
    });
  }

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
      <div className="grid items-end gap-3 rounded-sm bg-muted/20 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)]">
        <div className="min-w-0 space-y-2">
          <label htmlFor="applications-period" className="text-sm font-medium">Academic Period</label>
          <Select value={periodId ?? "all"} onValueChange={(value) => { setPeriodId(value === "all" ? null : value as Id<"academicPeriods">); clearSelection(); }}>
            <SelectTrigger id="applications-period" className="rounded-sm bg-background"><SelectValue placeholder="All semesters" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {(periods ?? []).map((period) => <SelectItem key={period._id} value={period._id}>{period.name} · Semester {period.term}, {period.year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <label htmlFor="applications-program" className="text-sm font-medium">Program</label>
          <Select value={programId ?? "all"} onValueChange={(value) => { setProgramId(value === "all" ? null : value as Id<"programs">); clearSelection(); }}>
            <SelectTrigger id="applications-program" className="rounded-sm bg-background"><SelectValue placeholder="All programs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {(programs ?? []).map((program) => <SelectItem key={program._id} value={program._id}>{program.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs
        value={status}
        onValueChange={(value) => { setStatus(value as StatusFilter); clearSelection(); }}
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
                  onChange={(event) => { setSearch(event.target.value); clearSelection(); }}
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
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-sm bg-muted/40 px-3 py-2">
                <span className="mr-auto text-sm font-medium">{selectedIds.size} selected</span>
                {selectedNewCount > 0 && <Button variant="outline" size="sm" onClick={() => void runBulkStatus("reviewing")} disabled={bulkBusy}>Move new to review</Button>}
                {selectedActionableCount > 0 && <Button size="sm" onClick={() => setConfirmBulkAccept(true)} disabled={bulkBusy}>Accept eligible</Button>}
                <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkBusy}>Clear</Button>
              </div>
            )}
            <ApplicationsResultsTable
              rows={rows}
              selectableIds={selectableRows.map((row) => row._id)}
              selectedIds={selectedIds}
              loading={applicants.status === "LoadingFirstPage"}
              canLoadMore={applicants.status === "CanLoadMore"}
              onToggle={toggleApplicant}
              onToggleVisible={toggleVisible}
              onReview={setSelectedApplicantId}
              onLoadMore={() => applicants.loadMore(25)}
            />
          </TabsContent>
        ))}
      </Tabs>
      <ApplicantDetailsSheet
        applicantId={selectedApplicantId}
        open={!!selectedApplicantId}
        onOpenChange={(open) => !open && setSelectedApplicantId(null)}
      />
      <AlertDialog open={confirmBulkAccept} onOpenChange={setConfirmBulkAccept}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept selected applications?</AlertDialogTitle>
            <AlertDialogDescription>Applications that are new or in review will be accepted. Other selected records will be skipped. You can continue each accepted applicant through offer and reporting steps individually.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkBusy} onClick={(event) => { event.preventDefault(); void runBulkStatus("accepted"); }}>{bulkBusy ? "Accepting…" : "Accept eligible"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

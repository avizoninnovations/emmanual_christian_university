"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { Check, Search, UserRoundCheck } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type RosterRow = {
  id: Id<"students">;
  name: string;
  registrationNumber: string;
  accessNumber: string;
  programName: string;
  yearOfStudy: number;
  registration: Doc<"studentSemesterRegistrations"> | null | undefined;
};

export function SemesterEnrollmentPanel() {
  const periods = useQuery(api.admissionsEnrollment.getEnrollmentPeriods, {});
  const enroll = useMutation(api.admissionsEnrollment.enrollStudentsForPeriod);
  const [periodId, setPeriodId] = useState<Id<"academicPeriods"> | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<Id<"students">>>(new Set());
  const [busy, setBusy] = useState(false);
  const roster = usePaginatedQuery(
    api.admissionsEnrollment.getEnrollmentRoster,
    periodId ? { periodId } : "skip",
    { initialNumItems: 30 },
  );
  const periodOptions = useMemo(
    () =>
      (periods ?? []).filter(
        (period) => period.status === "active" || period.status === "upcoming",
      ),
    [periods],
  );
  const rows = roster.results ?? [];
  const filtered = rows.filter((row) =>
    [row.name, row.registrationNumber, row.accessNumber, row.programName].some(
      (value) => value.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const toEnroll = filtered.filter(
    (row) => row.registration?.status !== "registered",
  );

  useEffect(() => {
    const firstPeriod =
      periodOptions.find((period) => period.status === "active") ??
      periodOptions[0];
    if (!periodId && firstPeriod) setPeriodId(firstPeriod._id);
  }, [periodId, periodOptions]);

  function toggleRow(id: Id<"students">, checked: boolean | "indeterminate") {
    setSelected((current) => {
      const next = new Set(current);
      if (checked === true) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function enrollSelected() {
    if (!periodId || selected.size === 0 || selected.size > 100) return;
    setBusy(true);
    try {
      const result = await enroll({ periodId, studentIds: [...selected] });
      toast.success(
        `${result.enrolledCount} student${result.enrolledCount === 1 ? "" : "s"} enrolled${result.alreadyRegistered ? ` · ${result.alreadyRegistered} already enrolled` : ""}.`,
      );
      setSelected(new Set());
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(
          error,
          "Could not record semester enrollment.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function enrollOne(row: RosterRow) {
    if (!periodId) return;
    setBusy(true);
    try {
      await enroll({ periodId, studentIds: [row.id] });
      toast.success(`${row.name} enrolled for this semester.`);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(
          error,
          "Could not record semester enrollment.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-border/70 shadow-none">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full max-w-sm space-y-2">
              <label
                htmlFor="admissions-period"
                className="text-sm font-medium"
              >
                Academic Period
              </label>
              {periods === undefined ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={periodId ?? ""}
                  onValueChange={(value) => {
                    setPeriodId(value as Id<"academicPeriods">);
                    setSelected(new Set());
                  }}
                >
                  <SelectTrigger id="admissions-period" className="rounded-sm">
                    <SelectValue placeholder="Choose an active or upcoming semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period._id} value={period._id}>
                        {period.name} {period.year} · {period.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative min-w-56 flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students"
                  className="rounded-sm pl-9 sm:w-64"
                />
              </div>
              <Button
                onClick={() => void enrollSelected()}
                disabled={
                  busy ||
                  selected.size === 0 ||
                  selected.size > 100 ||
                  !periodId
                }
              >
                {busy
                  ? "Recording…"
                  : `Enroll selected${selected.size ? ` (${selected.size})` : ""}`}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This records that active students are continuing in the selected
            semester. It does not select or change their course units.
          </p>
        </CardContent>
      </Card>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Select all unregistered students in this view"
                  checked={
                    toEnroll.length > 0 &&
                    toEnroll.every((row) => selected.has(row.id))
                  }
                  onCheckedChange={(checked) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      toEnroll.forEach((row) =>
                        checked === true
                          ? next.add(row.id)
                          : next.delete(row.id),
                      );
                      return next;
                    })
                  }
                />
              </TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Semester status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodId &&
              roster.status === "LoadingFirstPage" &&
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {filtered.map((row, index) => {
              const isRegistered = row.registration?.status === "registered";
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${row.name}`}
                      checked={selected.has(row.id)}
                      disabled={isRegistered || busy}
                      onCheckedChange={(checked) => toggleRow(row.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="min-w-52">
                    <span className="block font-medium">{row.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.registrationNumber} · {row.accessNumber}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-44">{row.programName}</TableCell>
                  <TableCell>Year {row.yearOfStudy}</TableCell>
                  <TableCell>
                    {isRegistered ? (
                      <div className="space-y-1">
                        <Badge className="rounded-sm bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
                          <Check className="mr-1 size-3" />
                          Enrolled
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {row.registration?.registrationSource === "student"
                            ? "Student portal"
                            : (row.registration?.registeredBy ??
                              "Previously recorded")}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline" className="rounded-sm">
                        Not enrolled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isRegistered ? (
                      <span className="text-xs text-muted-foreground">
                        Recorded
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-sm"
                        disabled={busy}
                        onClick={() => void enrollOne(row)}
                      >
                        <UserRoundCheck className="mr-1 size-4" />
                        Enroll
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!periodId && periods && periodOptions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  Create an active or upcoming Academic Period before enrolling
                  students.
                </TableCell>
              </TableRow>
            )}
            {periodId &&
              roster.status !== "LoadingFirstPage" &&
              filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? "No students match your search on this page."
                      : "No active students found for this period."}
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
      {roster.status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => roster.loadMore(30)}>
            Load more students
          </Button>
        </div>
      )}
    </div>
  );
}

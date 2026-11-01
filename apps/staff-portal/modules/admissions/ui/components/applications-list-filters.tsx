"use client";

import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { SearchableSelect } from "@workspace/ui/components/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export type ApplicantEnrollmentFilter = "all" | "enrolled" | "not_enrolled";

type ApplicationsListFiltersProps = {
  periods: Doc<"academicPeriods">[] | undefined;
  programs: Doc<"programs">[] | undefined;
  periodId: Id<"academicPeriods"> | null;
  programId: Id<"programs"> | null;
  enrollmentStatus: ApplicantEnrollmentFilter;
  onPeriodChange: (value: string) => void;
  onProgramChange: (value: string) => void;
  onEnrollmentStatusChange: (value: ApplicantEnrollmentFilter) => void;
};

export function ApplicationsListFilters({
  periods,
  programs,
  periodId,
  programId,
  enrollmentStatus,
  onPeriodChange,
  onProgramChange,
  onEnrollmentStatusChange,
}: ApplicationsListFiltersProps) {
  return (
    <div className="grid items-end gap-3 rounded-sm bg-muted/20 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_minmax(180px,.8fr)]">
      <div className="min-w-0 space-y-2">
        <label htmlFor="applications-period" className="text-sm font-medium">
          Academic Period
        </label>
        <Select value={periodId ?? "all"} onValueChange={onPeriodChange}>
          <SelectTrigger id="applications-period" className="rounded-sm bg-background">
            <SelectValue placeholder="All semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {(periods ?? []).map((period) => (
              <SelectItem key={period._id} value={period._id}>
                {period.name} · Semester {period.term}, {period.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2">
        <label htmlFor="applications-program" className="text-sm font-medium">
          Program
        </label>
        <SearchableSelect
          id="applications-program"
          aria-label="Program"
          value={programId ?? "all"}
          onValueChange={onProgramChange}
          placeholder="All programs"
          searchPlaceholder="Search programs…"
          options={[
            { value: "all", label: "All programs" },
            ...(programs ?? []).map((program) => ({
              value: program._id,
              label: program.name,
              keywords: program.code,
            })),
          ]}
        />
      </div>
      <div className="min-w-0 space-y-2">
        <label htmlFor="applications-enrollment" className="text-sm font-medium">
          Student enrollment
        </label>
        <Select
          value={enrollmentStatus}
          onValueChange={(value) =>
            onEnrollmentStatusChange(value as ApplicantEnrollmentFilter)
          }
        >
          <SelectTrigger id="applications-enrollment" className="rounded-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All applicants</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="not_enrolled">Not enrolled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

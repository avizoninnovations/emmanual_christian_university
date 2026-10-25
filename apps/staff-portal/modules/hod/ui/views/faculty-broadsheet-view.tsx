"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Download, Printer } from "lucide-react";
import Image from "next/image";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { StaffDataSkeleton } from "@/modules/dashboard/ui/components/staff-data-skeleton";
import { BroadsheetCourseMatrix } from "./broadsheet-course-matrix";
import { downloadBroadsheetCsv } from "./broadsheet-csv";
import { BroadsheetStudentDetails } from "./broadsheet-student-details";
import { BroadsheetStudentTable } from "./broadsheet-student-table";
import { BroadsheetSummaryStrip } from "./broadsheet-summary";
import type { BroadsheetStudent } from "./broadsheet-types";

const STUDY_YEARS = [1, 2, 3, 4] as const;

export function FacultyBroadsheetView() {
  const metadata = useQuery(api.broadsheet.getProgramsAndPeriods);
  const [selectedProgramId, setSelectedProgramId] = useState<Id<"programs"> | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<Id<"academicPeriods"> | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedStudent, setSelectedStudent] = useState<BroadsheetStudent | null>(null);

  const programs = metadata?.programs ?? [];
  const periods = metadata?.periods ?? [];
  const activeProgramId = selectedProgramId ?? programs[0]?._id;
  const activePeriodId = selectedPeriodId ?? periods.find((period) => period.status === "active")?._id ?? periods[0]?._id;
  const broadsheet = useQuery(
    api.broadsheet.getDepartmentBroadsheet,
    activeProgramId && activePeriodId
      ? { programId: activeProgramId, periodId: activePeriodId, yearOfStudy: selectedYear }
      : "skip",
  );

  if (!metadata) return <StaffDataSkeleton label="programs and academic periods" />;

  const hasChoices = programs.length > 0 && periods.length > 0;

  return (
    <main className="w-full space-y-5 p-4 lg:p-6 print:space-y-3 print:p-0">
      <div className="hidden print:flex print:flex-col print:items-center print:border-b print:pb-4 print:text-center">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="ECU crest" width={48} height={48} className="object-contain" />
          <div>
            <h1 className="text-lg font-bold uppercase">Emmanuel Christian University</h1>
            <p className="text-xs text-muted-foreground">Office of the Academic Registrar · Senate Examination Board</p>
            <p className="mt-1 text-xs font-semibold">Senate Broadsheet</p>
          </div>
        </div>
        {broadsheet && <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
          <span>Program: {broadsheet.program.name} ({broadsheet.program.code})</span>
          <span>Period: {broadsheet.period.name} ({broadsheet.period.year})</span>
          <span>Year {selectedYear}</span>
        </div>}
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Senate Broadsheet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Student progression across a program semester</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!broadsheet} onClick={() => broadsheet && downloadBroadsheetCsv(broadsheet)}>
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
          <Button size="sm" disabled={!broadsheet} onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Print
          </Button>
        </div>
      </header>

      {!hasChoices ? (
        <Card className="rounded-sm shadow-none">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Programs and academic periods are required before a Senate Broadsheet can be displayed.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 print:hidden">
            <FilterSelect label="Program" value={activeProgramId ?? ""} onValueChange={(value) => {
              setSelectedStudent(null);
              setSelectedProgramId(programs.find((program) => program._id === value)?._id ?? null);
            }}>
              {programs.map((program) => <SelectItem key={program._id} value={program._id}>{program.name} ({program.code})</SelectItem>)}
            </FilterSelect>
            <FilterSelect label="Academic Period" value={activePeriodId ?? ""} onValueChange={(value) => {
              setSelectedStudent(null);
              setSelectedPeriodId(periods.find((period) => period._id === value)?._id ?? null);
            }}>
              {periods.map((period) => <SelectItem key={period._id} value={period._id}>{period.name} ({period.year})</SelectItem>)}
            </FilterSelect>
            <FilterSelect label="Year of Study" value={String(selectedYear)} onValueChange={(value) => {
              const year = Number(value);
              if (STUDY_YEARS.includes(year as (typeof STUDY_YEARS)[number])) {
                setSelectedStudent(null);
                setSelectedYear(year);
              }
            }}>
              {STUDY_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
            </FilterSelect>
          </div>

          {broadsheet === undefined ? <StaffDataSkeleton label="senate broadsheet" /> : broadsheet ? (
            <div className="space-y-4">
              <section className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div>
                  <h2 className="font-medium">{broadsheet.program.name} <span className="text-muted-foreground">· Year {selectedYear}</span></h2>
                  <p className="text-sm text-muted-foreground">{broadsheet.period.name} ({broadsheet.period.year}) · {broadsheet.program.departmentName}</p>
                </div>
                <Badge variant="secondary" className="rounded-sm">{broadsheet.courses.length} course units</Badge>
              </section>
              <div className="print:hidden"><BroadsheetSummaryStrip summary={broadsheet.summary} /></div>
              <Tabs defaultValue="students" className="print:hidden">
                <TabsList>
                  <TabsTrigger value="students">Student overview</TabsTrigger>
                  <TabsTrigger value="matrix">Course matrix</TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="pt-3">
                  <BroadsheetStudentTable data={broadsheet} onViewStudent={setSelectedStudent} />
                </TabsContent>
                <TabsContent value="matrix" className="pt-3">
                  <BroadsheetCourseMatrix data={broadsheet} />
                </TabsContent>
              </Tabs>
              <div className="hidden print:block"><BroadsheetCourseMatrix data={broadsheet} /></div>
              <div className="hidden space-y-5 border-t pt-5 print:block">
                <h3 className="text-center text-xs font-bold uppercase">University Senate and Examination Board Approvals</h3>
                <div className="grid grid-cols-3 gap-8 pt-3">
                  {[
                    "Head of Department",
                    "Dean of Faculty",
                    "Academic Registrar / Senate Secretary",
                  ].map((title) => <div key={title} className="border-t border-dashed pt-2">
                    <p className="text-xs font-semibold uppercase">{title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Signature and date: __________________</p>
                  </div>)}
                </div>
              </div>
              <BroadsheetStudentDetails data={broadsheet} student={selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)} />
            </div>
          ) : (
            <Card className="rounded-sm shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">The selected program or academic period is no longer available.</CardContent></Card>
          )}
        </>
      )}

    </main>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

function FilterSelect({ label, value, onValueChange, children }: FilterSelectProps) {
  return <div className="space-y-1.5 text-xs font-medium text-muted-foreground">
    <span>{label}</span>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="rounded-sm"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  </div>;
}

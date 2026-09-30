"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Award,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  TrendingUp,
  Loader2,
  Filter,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function FacultyBroadsheetView() {
  const metadata = useQuery(api.broadsheet.getProgramsAndPeriods);

  const [selectedProgramId, setSelectedProgramId] = useState<Id<"programs"> | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<Id<"academicPeriods"> | null>(null);
  const [selectedYearOfStudy, setSelectedYearOfStudy] = useState<number>(1);

  // Set default selections once loaded
  const programs = metadata?.programs || [];
  const periods = metadata?.periods || [];

  const activeProgramId = selectedProgramId || programs[0]?._id;
  const activePeriodId = selectedPeriodId || periods[0]?._id;

  const broadsheet = useQuery(
    api.broadsheet.getDepartmentBroadsheet,
    activeProgramId && activePeriodId
      ? {
          programId: activeProgramId,
          periodId: activePeriodId,
          yearOfStudy: selectedYearOfStudy,
        }
      : "skip"
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!broadsheet || broadsheet.students.length === 0) return;

    const courseHeaders: string[] = [];
    broadsheet.courses.forEach((c: any) => {
      courseHeaders.push(`${c.code}_CW(30)`, `${c.code}_EX(70)`, `${c.code}_TOT(100)`, `${c.code}_GR`);
    });

    const headers = [
      "Registration Number",
      "Candidate Name",
      ...courseHeaders,
      "Attempted CU",
      "Passed CU",
      "Semester GPA",
      "Academic Decision",
    ];

    const rows = broadsheet.students.map((st: any) => {
      const courseValues: (string | number)[] = [];
      broadsheet.courses.forEach((c: any) => {
        const res = st.courseResults.find((r: any) => r.courseId === c._id);
        if (res) {
          courseValues.push(res.coursework, res.exam, res.finalScore, res.grade);
        } else {
          courseValues.push("-", "-", "-", "-");
        }
      });

      return [
        `"${st.registrationNumber}"`,
        `"${st.name}"`,
        ...courseValues,
        st.totalAttemptedCU,
        st.totalPassedCU,
        st.gpa.toFixed(2),
        `"${st.decision}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ECU_Senate_Broadsheet_${broadsheet.program.code}_Year${selectedYearOfStudy}_${broadsheet.period.name}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!metadata) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading academic programs and periods...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-full mx-auto w-full print:p-0 print:m-0">
      {/* ── Official Print Header (Visible on print only) ── */}
      <div className="hidden print:flex flex-col items-center text-center border-b pb-4 mb-4">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="ECU Logo" width={50} height={50} className="object-contain" />
          <div className="text-center">
            <h1 className="text-lg font-extrabold uppercase tracking-wide">
              EMMANUEL CHRISTIAN UNIVERSITY
            </h1>
            <p className="text-xs uppercase font-medium text-muted-foreground">
              Office of the Academic Registrar &bull; Senate Examination Board
            </p>
            <p className="text-xs font-bold mt-1">
              FACULTY EXAMINATION BROADSHEET & MASTER MARKSHEET
            </p>
          </div>
        </div>
        {broadsheet && (
          <div className="text-[11px] mt-2 flex gap-4 text-muted-foreground">
            <span><strong>Program:</strong> {broadsheet.program.name} ({broadsheet.program.code})</span>
            <span><strong>Department:</strong> {broadsheet.program.departmentName}</span>
            <span><strong>Period:</strong> {broadsheet.period.name} ({broadsheet.period.year})</span>
            <span><strong>Cohort:</strong> Year {selectedYearOfStudy}</span>
          </div>
        )}
      </div>

      {/* ── Screen Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Faculty Examination Broadsheet
            </h1>
            <Badge variant="outline" className="text-xs uppercase">
              Senate Format
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Departmental master marksheet compilation for Faculty Board review and Senate degree confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="size-3.5" /> Export Broadsheet (CSV)
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-primary text-primary-foreground">
            <Printer className="size-3.5" /> Print Senate Broadsheet
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="shadow-sm border print:hidden">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            <Filter className="size-3.5" /> Broadsheet Parameters:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {/* Program */}
            <div>
              <Select
                value={activeProgramId}
                onValueChange={(val) => setSelectedProgramId(val as Id<"programs">)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p: any) => (
                    <SelectItem key={p._id} value={p._id} className="text-xs">
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Period */}
            <div>
              <Select
                value={activePeriodId}
                onValueChange={(val) => setSelectedPeriodId(val as Id<"academicPeriods">)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p: any) => (
                    <SelectItem key={p._id} value={p._id} className="text-xs">
                      {p.name} ({p.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year of Study */}
            <div>
              <Select
                value={String(selectedYearOfStudy)}
                onValueChange={(val) => setSelectedYearOfStudy(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Year of Study" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">Year 1 (Freshman)</SelectItem>
                  <SelectItem value="2" className="text-xs">Year 2 (Sophomore)</SelectItem>
                  <SelectItem value="3" className="text-xs">Year 3 (Junior)</SelectItem>
                  <SelectItem value="4" className="text-xs">Year 4 (Senior)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Broadsheet Metrics Summary ── */}
      {broadsheet && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Candidates</p>
              <p className="text-xl font-bold mt-0.5">{broadsheet.summary.totalCandidates}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Pass Rate</p>
              <p className="text-xl font-bold mt-0.5 text-emerald-600">
                {broadsheet.summary.passRate}%
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Clear Pass</p>
              <p className="text-xl font-bold mt-0.5 text-emerald-600">
                {broadsheet.summary.clearPassCount}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Supplementary</p>
              <p className="text-xl font-bold mt-0.5 text-amber-600">
                {broadsheet.summary.supplementaryCount}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Repeat / Retake</p>
              <p className="text-xl font-bold mt-0.5 text-rose-600">
                {broadsheet.summary.repeatCount}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Class Mean GPA</p>
              <p className="text-xl font-bold mt-0.5 text-primary">
                {broadsheet.summary.averageGPA.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Main Broadsheet Matrix Table ── */}
      {!broadsheet ? (
        <div className="p-12 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Compiling departmental broadsheet...</p>
        </div>
      ) : (
        <Card className="shadow-sm border overflow-hidden">
          <CardHeader className="pb-3 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {broadsheet.program.name} ({broadsheet.program.code}) &bull; Year {selectedYearOfStudy}
                </CardTitle>
                <CardDescription className="text-xs">
                  {broadsheet.period.name} ({broadsheet.period.year}) &bull; Department of {broadsheet.program.departmentName}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {broadsheet.courses.length} Curriculum Units Evaluated
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table className="text-xs border-collapse">
              <TableHeader className="bg-muted/50 text-[11px]">
                {/* Top Header Row */}
                <TableRow>
                  <TableHead className="pl-4 w-28 border-r" rowSpan={2}>
                    Reg Number
                  </TableHead>
                  <TableHead className="min-w-[160px] border-r" rowSpan={2}>
                    Candidate Full Name
                  </TableHead>

                  {/* Course Columns */}
                  {broadsheet.courses.map((c: any) => (
                    <TableHead
                      key={c._id}
                      colSpan={4}
                      className="text-center font-bold border-r bg-muted/30 py-1"
                    >
                      {c.code} ({c.creditUnits} CU)
                    </TableHead>
                  ))}

                  {/* Summary Columns */}
                  <TableHead className="text-center border-r" rowSpan={2}>
                    Att. CU
                  </TableHead>
                  <TableHead className="text-center border-r" rowSpan={2}>
                    Pass CU
                  </TableHead>
                  <TableHead className="text-center border-r font-bold" rowSpan={2}>
                    SGPA
                  </TableHead>
                  <TableHead className="text-center pr-4 min-w-[200px]" rowSpan={2}>
                    Senate Board Decision
                  </TableHead>
                </TableRow>

                {/* Sub-Header Row for Course Metrics */}
                <TableRow>
                  {broadsheet.courses.map((c: any) => (
                    <div key={c._id} className="contents">
                      <TableHead className="w-10 text-center text-[10px] p-1 border-r font-mono">
                        CW
                      </TableHead>
                      <TableHead className="w-10 text-center text-[10px] p-1 border-r font-mono">
                        EX
                      </TableHead>
                      <TableHead className="w-12 text-center text-[10px] p-1 border-r font-mono font-bold">
                        TOT
                      </TableHead>
                      <TableHead className="w-10 text-center text-[10px] p-1 border-r font-semibold">
                        GR
                      </TableHead>
                    </div>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {broadsheet.students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + broadsheet.courses.length * 4}
                      className="h-32 text-center text-muted-foreground text-xs"
                    >
                      No enrolled students found for {broadsheet.program.name} Year {selectedYearOfStudy}.
                    </TableCell>
                  </TableRow>
                ) : (
                  broadsheet.students.map((st: any) => (
                    <TableRow key={st.studentId} className="hover:bg-muted/30 border-b">
                      <TableCell className="pl-4 font-mono font-semibold text-xs border-r text-primary">
                        {st.registrationNumber}
                      </TableCell>
                      <TableCell className="font-medium text-xs border-r">
                        {st.name}
                      </TableCell>

                      {/* Course Results */}
                      {broadsheet.courses.map((c: any) => {
                        const res = st.courseResults.find((r: any) => r.courseId === c._id);
                        if (!res) {
                          return (
                            <div key={c._id} className="contents">
                              <TableCell className="text-center text-muted-foreground p-1 border-r">-</TableCell>
                              <TableCell className="text-center text-muted-foreground p-1 border-r">-</TableCell>
                              <TableCell className="text-center text-muted-foreground p-1 border-r">-</TableCell>
                              <TableCell className="text-center text-muted-foreground p-1 border-r">-</TableCell>
                            </div>
                          );
                        }

                        return (
                          <div key={c._id} className="contents">
                            <TableCell className="text-center font-mono text-[11px] p-1 border-r">
                              {res.coursework}
                            </TableCell>
                            <TableCell className="text-center font-mono text-[11px] p-1 border-r">
                              {res.exam}
                            </TableCell>
                            <TableCell className="text-center font-mono text-[11px] font-bold p-1 border-r">
                              <span className={res.finalScore < 50 ? "text-rose-600" : ""}>
                                {res.finalScore}
                              </span>
                            </TableCell>
                            <TableCell className="text-center p-1 border-r">
                              <span
                                className={`text-[11px] font-bold ${
                                  res.grade === "A" || res.grade === "B+" || res.grade === "B"
                                    ? "text-emerald-600"
                                    : res.grade === "C+" || res.grade === "C"
                                    ? "text-blue-600"
                                    : res.grade === "D"
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {res.grade}
                              </span>
                            </TableCell>
                          </div>
                        );
                      })}

                      {/* Cumulative Columns */}
                      <TableCell className="text-center font-mono text-xs border-r">
                        {st.totalAttemptedCU}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs border-r font-semibold">
                        {st.totalPassedCU}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs border-r font-bold">
                        <span className={st.gpa < 2.0 ? "text-rose-600" : "text-foreground"}>
                          {st.gpa.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-tight ${
                            st.decisionType === "proceed"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                              : st.decisionType === "supplementary"
                              ? "bg-amber-500/10 text-amber-700 border-amber-300"
                              : "bg-rose-500/10 text-rose-700 border-rose-300"
                          }`}
                        >
                          {st.decision}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Official Senate Sign-Off Block ── */}
      <div className="pt-8 border-t space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center print:text-left">
          Official University Senate & Examination Board Approvals
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4">
          <div className="border-t border-dashed pt-3 text-center sm:text-left">
            <p className="text-xs font-bold">HEAD OF DEPARTMENT</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Signature & Date: ___________________</p>
          </div>

          <div className="border-t border-dashed pt-3 text-center sm:text-left">
            <p className="text-xs font-bold">DEAN OF FACULTY</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Signature & Date: ___________________</p>
          </div>

          <div className="border-t border-dashed pt-3 text-center sm:text-left">
            <p className="text-xs font-bold">ACADEMIC REGISTRAR / SENATE SECRETARY</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Signature & Date: ___________________</p>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground pt-4">
          Emmanuel Christian University &bull; Official Senate Broadsheet &bull; Governed by MoHEST Academic Examination Regulations
        </p>
      </div>
    </div>
  );
}

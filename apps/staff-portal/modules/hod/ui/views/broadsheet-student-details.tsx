import { useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Sheet,
  WideSheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { decisionTone, type BroadsheetData, type BroadsheetStudent } from "./broadsheet-types";

type StudentDetailsProps = {
  data: BroadsheetData;
  student: BroadsheetStudent | null;
  onOpenChange: (open: boolean) => void;
};

export function BroadsheetStudentDetails({ data, student, onOpenChange }: StudentDetailsProps) {
  const [tab, setTab] = useState("overview");
  const marks = new Map(student?.courseResults.map((result) => [result.courseId, result]) ?? []);

  return (
    <Sheet open={student !== null} onOpenChange={onOpenChange}>
      <WideSheetContent side="right" className="gap-0 overflow-hidden rounded-none p-0">
        {student && (
          <>
            <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-lg">{student.name}</SheetTitle>
                  <SheetDescription className="mt-1">
                    {student.registrationNumber} · {data.program.code} · Year {data.yearOfStudy}
                  </SheetDescription>
                </div>
                <Badge className={`rounded-sm border-0 ${decisionTone(student.decisionType)}`}>
                  {student.decision}
                </Badge>
              </div>
            </SheetHeader>
            <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 overflow-hidden gap-0">
              <TabsList className="justify-start px-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="course-units">Course units ({data.courses.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="h-full overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Metric label="Units with marks" value={`${student.courseResults.length} / ${data.courses.length}`} />
                  <Metric label="Attempted credit units" value={student.totalAttemptedCU} />
                  <Metric label="Passed credit units" value={student.totalPassedCU} />
                  <Metric label="Semester GPA" value={student.totalAttemptedCU ? student.gpa.toFixed(2) : "—"} />
                </div>
                <Card className="mt-5 rounded-sm shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <h3 className="text-sm font-semibold">Senate outcome</h3>
                    <p className="text-sm text-muted-foreground">{student.decision}</p>
                    <p className="text-xs text-muted-foreground">
                      Results shown here are approved and published marks for {data.period.name} ({data.period.year}).
                    </p>
                  </CardContent>
                </Card>
                <p className="mt-4 text-xs text-muted-foreground">
                  {student.email !== "—" ? student.email : "No email recorded"}
                </p>
              </TabsContent>
              <TabsContent value="course-units" className="h-full overflow-y-auto px-6 pb-6">
                <div className="mb-4 pt-4">
                  <h3 className="text-sm font-semibold">Published marks by course unit</h3>
                  <p className="text-xs text-muted-foreground">{data.period.name} ({data.period.year}) · {data.program.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course unit</TableHead>
                        <TableHead className="text-center">CU</TableHead>
                        <TableHead className="text-center">CW / 30</TableHead>
                        <TableHead className="text-center">Exam / 70</TableHead>
                        <TableHead className="text-center">Total / 100</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.courses.map((course) => {
                        const result = marks.get(course._id);
                        return (
                          <TableRow key={course._id}>
                            <TableCell>
                              <div className="font-medium">{course.title}</div>
                              <div className="text-xs text-muted-foreground">{course.code}</div>
                            </TableCell>
                            <TableCell className="text-center">{course.creditUnits}</TableCell>
                            <TableCell className="text-center">{result?.coursework ?? "—"}</TableCell>
                            <TableCell className="text-center">{result?.exam ?? "—"}</TableCell>
                            <TableCell className="text-center font-medium">{result?.finalScore ?? "—"}</TableCell>
                            <TableCell className="text-center font-semibold">{result?.grade ?? "—"}</TableCell>
                            <TableCell>
                              {result ? <Badge className="rounded-sm border-0 bg-emerald-500/10 text-emerald-700">Published</Badge> : <span className="text-xs text-muted-foreground">No published mark</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {data.courses.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No course units are configured for this period and year.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </WideSheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-sm shadow-none">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

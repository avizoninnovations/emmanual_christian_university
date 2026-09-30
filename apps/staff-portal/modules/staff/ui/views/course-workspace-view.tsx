"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  BookOpen,
  Users,
  Award,
  CalendarCheck,
  ArrowLeft,
  Save,
  Send,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Unlock,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Check,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

// South Sudan Grade Calculator
function calculateGrade(score: number): { grade: string; gradePoints: number } {
  if (score >= 80) return { grade: "A", gradePoints: 4.0 };
  if (score >= 70) return { grade: "B+", gradePoints: 3.5 };
  if (score >= 60) return { grade: "B", gradePoints: 3.0 };
  if (score >= 55) return { grade: "C+", gradePoints: 2.5 };
  if (score >= 50) return { grade: "C", gradePoints: 2.0 };
  if (score >= 40) return { grade: "D", gradePoints: 1.0 };
  return { grade: "F", gradePoints: 0.0 };
}

interface CourseWorkspaceViewProps {
  courseId: Id<"courses">;
}

export function CourseWorkspaceView({ courseId }: CourseWorkspaceViewProps) {
  const courseDetails = useQuery(api.courses.getCourseById, { id: courseId });
  const gradebook = useQuery(api.marks.getCourseGradebook, { courseId });
  const attendanceHistory = useQuery(api.attendance.getCourseAttendanceHistory, { courseId }) || [];
  const studentAttendance = useQuery(api.attendance.getStudentAttendanceSummary, { courseId }) || [];

  const saveAssessments = useMutation(api.marks.saveGradebookDraft);
  const submitToHOD = useMutation(api.marks.submitGradebookToHOD);
  const recordAttendance = useMutation(api.attendance.recordAttendanceSession);

  // Local state for grade edits
  const [marksState, setMarksState] = useState<
    Map<string, { coursework: number; assignment?: number; test?: number; exam: number }>
  >(new Map());
  const [isDetailedCAMode, setIsDetailedCAMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attendance local state
  const [rollCallDate, setRollCallDate] = useState<string>(
    new Date().toISOString().split("T")[0] || "2026-09-16"
  );
  const [rollCallTopic, setRollCallTopic] = useState<string>("");
  const [rollCallStatus, setRollCallStatus] = useState<
    Map<string, "present" | "absent" | "late">
  >(new Map());
  const [isSavingRollCall, setIsSavingRollCall] = useState(false);

  // Sync gradebook to local state on initial load
  useEffect(() => {
    if (gradebook?.students) {
      const initialMap = new Map<
        string,
        { coursework: number; assignment?: number; test?: number; exam: number }
      >();
      let hasDetailed = false;
      gradebook.students.forEach((s) => {
        if (s.assignmentMarks !== undefined || s.testMarks !== undefined) {
          hasDetailed = true;
        }
        initialMap.set(s.studentId, {
          coursework: s.courseworkMarks,
          assignment: s.assignmentMarks,
          test: s.testMarks,
          exam: s.examMarks,
        });
      });
      setMarksState(initialMap);
      if (hasDetailed) setIsDetailedCAMode(true);

      // Default attendance to present
      const defaultAtt = new Map<string, "present" | "absent" | "late">();
      gradebook.students.forEach((s) => {
        defaultAtt.set(s.studentId, "present");
      });
      setRollCallStatus(defaultAtt);
    }
  }, [gradebook]);

  if (!courseDetails || !gradebook) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading course workspace...</p>
      </div>
    );
  }

  const course = courseDetails;
  const isLocked =
    gradebook.overallStatus === "submitted" ||
    gradebook.overallStatus === "approved";

  // Handlers for marks input
  const handleMarkChange = (
    studentId: string,
    field: "coursework" | "assignment" | "test" | "exam",
    valueStr: string
  ) => {
    const raw = Number(valueStr);
    const num = isNaN(raw) ? 0 : raw;

    setMarksState((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) || { coursework: 0, exam: 0 };
      const updated = { ...current };

      if (field === "assignment") {
        const capped = Math.min(10, Math.max(0, num));
        updated.assignment = capped;
        updated.coursework = Math.min(30, (capped || 0) + (updated.test || 0));
      } else if (field === "test") {
        const capped = Math.min(20, Math.max(0, num));
        updated.test = capped;
        updated.coursework = Math.min(30, (updated.assignment || 0) + (capped || 0));
      } else if (field === "coursework") {
        const capped = Math.min(30, Math.max(0, num));
        updated.coursework = capped;
      } else if (field === "exam") {
        const capped = Math.min(70, Math.max(0, num));
        updated.exam = capped;
      }

      next.set(studentId, updated);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = async () => {
    if (!gradebook.period) return;
    try {
      setIsSaving(true);
      const marks = Array.from(marksState.entries()).map(([studentId, m]) => ({
        studentId: studentId as Id<"students">,
        assignmentMarks: m.assignment,
        testMarks: m.test,
        courseworkMarks: m.coursework,
        examMarks: m.exam,
      }));

      await saveAssessments({
        courseId,
        periodId: gradebook.period._id,
        marks,
      });

      setHasUnsavedChanges(false);
      toast.success("Draft assessments saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitToHOD = async () => {
    if (!gradebook.period) return;
    try {
      setIsSubmitting(true);
      // Auto-save any pending changes first
      if (hasUnsavedChanges) {
        const marks = Array.from(marksState.entries()).map(([studentId, m]) => ({
          studentId: studentId as Id<"students">,
          courseworkMarks: m.coursework,
          examMarks: m.exam,
        }));
        await saveAssessments({
          courseId,
          periodId: gradebook.period._id,
          marks,
        });
      }

      await submitToHOD({
        courseId,
        periodId: gradebook.period._id,
      });

      setSubmitDialogOpen(false);
      setHasUnsavedChanges(false);
      toast.success("Gradebook submitted to HOD for formal approval");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit to HOD");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!gradebook.students || gradebook.students.length === 0) return;

    const headers = [
      "Registration Number",
      "Student Name",
      "Assignment (10%)",
      "CAT / Midterm (20%)",
      "Coursework (30%)",
      "Exam (70%)",
      "Total Score (100%)",
      "Letter Grade",
      "Grade Points",
      "Status",
    ];

    const rows = gradebook.students.map((s) => {
      const local = marksState.get(s.studentId) || {
        coursework: s.courseworkMarks,
        assignment: s.assignmentMarks,
        test: s.testMarks,
        exam: s.examMarks,
      };
      const total = Math.round(local.coursework + local.exam);
      const { grade, gradePoints } = calculateGrade(total);

      return [
        `"${s.studentRegNumber}"`,
        `"${s.studentName}"`,
        local.assignment ?? "",
        local.test ?? "",
        local.coursework,
        local.exam,
        total,
        grade,
        gradePoints.toFixed(1),
        s.status,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ECU_${course?.code}_Gradebook_${gradebook.period?.name || "Term"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Roll call attendance handlers
  const handleRollCallToggle = (
    studentId: string,
    status: "present" | "absent" | "late"
  ) => {
    setRollCallStatus((prev) => {
      const next = new Map(prev);
      next.set(studentId, status);
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!gradebook.period) return;
    try {
      setIsSavingRollCall(true);
      const records = Array.from(rollCallStatus.entries()).map(
        ([studentId, status]) => ({
          studentId: studentId as Id<"students">,
          status,
        })
      );

      await recordAttendance({
        courseId,
        periodId: gradebook.period._id,
        date: rollCallDate,
        topic: rollCallTopic.trim() || undefined,
        records,
      });

      toast.success("Roll call session recorded successfully");
      setRollCallTopic("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record roll call session");
    } finally {
      setIsSavingRollCall(false);
    }
  };

  const totalStudents = gradebook.students.length;
  const passedStudents = gradebook.students.filter((s) => {
    const local = marksState.get(s.studentId) || {
      coursework: s.courseworkMarks,
      exam: s.examMarks,
    };
    return local.coursework + local.exam >= 50;
  }).length;
  const passRate =
    totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  const averageScore =
    totalStudents > 0
      ? Math.round(
          gradebook.students.reduce((acc, s) => {
            const local = marksState.get(s.studentId) || {
              coursework: s.courseworkMarks,
              exam: s.examMarks,
            };
            return acc + (local.coursework + local.exam);
          }, 0) / totalStudents
        )
      : 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href="/staff/courses">
              <ArrowLeft className="size-4" /> Back to Teaching Courses
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {course?.code}: {course?.title}
              </h1>
              {gradebook.overallStatus === "approved" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                  <CheckCircle2 className="size-3 mr-1" /> HOD Approved
                </Badge>
              )}
              {gradebook.overallStatus === "submitted" && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                  <Clock className="size-3 mr-1" /> Submitted to HOD
                </Badge>
              )}
              {gradebook.overallStatus === "returned" && (
                <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">
                  <AlertCircle className="size-3 mr-1" /> Revision Requested
                </Badge>
              )}
              {gradebook.overallStatus === "draft" && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                  <FileSpreadsheet className="size-3 mr-1" /> Draft Mode
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {course?.programName} &bull; {course?.departmentName} &bull; {course?.creditUnits} Credit Units &bull;{" "}
              {gradebook.period?.name || "Active Semester"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5"
            >
              <Download className="size-3.5" /> Export CSV
            </Button>

            {!isLocked && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Draft
                </Button>

                <Button
                  size="sm"
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={totalStudents === 0 || isSubmitting}
                  className="gap-1.5 bg-primary text-primary-foreground"
                >
                  <Send className="size-3.5" /> Submit to HOD
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Banners ── */}
      {gradebook.overallStatus === "returned" && (
        <Card className="border-rose-200 bg-rose-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                  Marks returned by Head of Department
                </p>
                <p className="text-sm text-rose-700 dark:text-rose-400">
                  <strong>Reason:</strong> {gradebook.returnReason || "Please review continuous assessment and exam mark discrepancies."}
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  You can edit the marks and click "Submit to HOD" once revised.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {gradebook.overallStatus === "submitted" && (
        <Card className="border-blue-200 bg-blue-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Clock className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Gradebook is currently under HOD review
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assessment scores are locked against modification while pending approval from your Department Head.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {gradebook.overallStatus === "approved" && (
        <Card className="border-emerald-200 bg-emerald-500/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Grades finalized and approved by HOD
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marks are officially archived and published to student portals. To modify an individual student's score, request an unlock grant from the HOD.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Class Size
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{passRate}%</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Pass Rate (&ge; 50%)
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Award className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{averageScore}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Class Mean Score
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold capitalize">{gradebook.overallStatus}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Workflow State
                </p>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Clock className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Workspace Tabs ── */}
      <Tabs defaultValue="gradebook" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="gradebook" className="gap-2">
            <FileSpreadsheet className="size-4" />
            Gradebook (30% CW / 70% Exam)
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <CalendarCheck className="size-4" />
            Roll Call & Attendance
          </TabsTrigger>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="size-4" />
            Enrolled Directory ({totalStudents})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: GRADEBOOK ── */}
        <TabsContent value="gradebook">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Continuous Assessment & Examination Sheet
                  </CardTitle>
                  <CardDescription className="text-xs">
                    South Sudan Standard: Coursework out of 30 (10% Assignment + 20% CAT), Final Examination out of 70.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDetailedCAMode(!isDetailedCAMode)}
                    className="h-7 text-xs gap-1.5"
                  >
                    {isDetailedCAMode
                      ? "Switch to Combined CW (30)"
                      : "Detailed CA (10% Assign + 20% CAT)"}
                  </Button>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 w-fit text-[11px]">
                      Unsaved Changes Present
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6 w-36">Reg Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    {isDetailedCAMode ? (
                      <>
                        <TableHead className="w-24 text-center">Assign (10)</TableHead>
                        <TableHead className="w-24 text-center">CAT (20)</TableHead>
                        <TableHead className="w-24 text-center bg-muted/30">CW (30)</TableHead>
                      </>
                    ) : (
                      <TableHead className="w-36 text-center">CW (Max 30)</TableHead>
                    )}
                    <TableHead className="w-32 text-center">Exam (Max 70)</TableHead>
                    <TableHead className="w-24 text-center font-bold">Total (100)</TableHead>
                    <TableHead className="w-20 text-center">Grade</TableHead>
                    <TableHead className="w-16 text-center">GP</TableHead>
                    <TableHead className="text-right pr-6 w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradebook.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isDetailedCAMode ? 10 : 8} className="h-32 text-center text-muted-foreground">
                        No registered students found for this course in the active period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    gradebook.students.map((student) => {
                      const local = marksState.get(student.studentId) || {
                        coursework: student.courseworkMarks,
                        assignment: student.assignmentMarks,
                        test: student.testMarks,
                        exam: student.examMarks,
                      };
                      const total = Math.round(local.coursework + local.exam);
                      const { grade, gradePoints } = calculateGrade(total);
                      const canEditThisRow = !isLocked || student.isUnlocked;

                      return (
                        <TableRow key={student.studentId} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-mono text-xs font-semibold text-muted-foreground">
                            {student.studentRegNumber}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <span>{student.studentName}</span>
                              {student.isUnlocked && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300 gap-1">
                                  <Unlock className="size-2.5" /> Unlocked
                                </Badge>
                              )}
                              {student.isSupplementary && (
                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-300">
                                  Supplementary
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Coursework / Detailed CA Inputs */}
                          {isDetailedCAMode ? (
                            <>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  disabled={!canEditThisRow}
                                  value={local.assignment ?? ""}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleMarkChange(student.studentId, "assignment", e.target.value)
                                  }
                                  className="w-16 mx-auto text-center font-mono text-sm h-8"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  disabled={!canEditThisRow}
                                  value={local.test ?? ""}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleMarkChange(student.studentId, "test", e.target.value)
                                  }
                                  className="w-16 mx-auto text-center font-mono text-sm h-8"
                                />
                              </TableCell>
                              <TableCell className="text-center font-mono font-semibold text-sm bg-muted/20">
                                {local.coursework}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={30}
                                disabled={!canEditThisRow}
                                value={local.coursework}
                                onChange={(e) =>
                                  handleMarkChange(student.studentId, "coursework", e.target.value)
                                }
                                className="w-24 mx-auto text-center font-mono text-sm h-8"
                              />
                            </TableCell>
                          )}

                          {/* Exam Input */}
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0}
                              max={70}
                              disabled={!canEditThisRow}
                              value={local.exam}
                              onChange={(e) =>
                                handleMarkChange(student.studentId, "exam", e.target.value)
                              }
                              className="w-24 mx-auto text-center font-mono text-sm h-8"
                            />
                          </TableCell>

                          {/* Total Score */}
                          <TableCell className="text-center font-mono font-bold text-sm">
                            <span
                              className={
                                total >= 50
                                  ? "text-foreground"
                                  : "text-rose-600 font-bold"
                              }
                            >
                              {total}
                            </span>
                          </TableCell>

                          {/* Letter Grade */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                grade === "A" || grade === "B+" || grade === "B"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                  : grade === "C+" || grade === "C"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                  : grade === "D"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                  : "bg-rose-500/10 text-rose-600 border-rose-200"
                              }
                            >
                              {grade}
                            </Badge>
                          </TableCell>

                          {/* Grade Points */}
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {gradePoints.toFixed(1)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-right pr-6">
                            <Badge
                              variant="outline"
                              className={
                                student.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"
                                  : student.status === "submitted"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]"
                                  : "bg-muted text-muted-foreground text-[10px]"
                              }
                            >
                              {student.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: ATTENDANCE & ROLL CALL ── */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Session Roll Call */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Take Session Roll Call</CardTitle>
                  <Button
                    size="sm"
                    onClick={handleSaveAttendance}
                    disabled={isSavingRollCall || totalStudents === 0}
                    className="gap-1.5"
                  >
                    {isSavingRollCall && <Loader2 className="size-3.5 animate-spin" />}
                    Save Attendance
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Mark each student as Present (P), Absent (A), or Late (L).
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Session Date
                    </label>
                    <Input
                      type="date"
                      value={rollCallDate}
                      onChange={(e) => setRollCallDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Lecture Topic / Lab Focus
                    </label>
                    <Input
                      placeholder="e.g. Pointers & Dynamic Memory Allocation"
                      value={rollCallTopic}
                      onChange={(e) => setRollCallTopic(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                  {gradebook.students.map((student) => {
                    const currentStatus = rollCallStatus.get(student.studentId) || "present";
                    return (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between p-2.5 text-xs hover:bg-muted/20"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{student.studentName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {student.studentRegNumber}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
                          <button
                            type="button"
                            onClick={() =>
                              setRollCallStatus((prev) => new Map(prev).set(student.studentId, "present"))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              currentStatus === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRollCallStatus((prev) => new Map(prev).set(student.studentId, "late"))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              currentStatus === "late"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRollCallStatus((prev) => new Map(prev).set(student.studentId, "absent"))
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              currentStatus === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Attendance History Sidebar */}
            <Card className="shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="size-4 text-muted-foreground" /> Session History
                </CardTitle>
                <CardDescription className="text-xs">
                  {attendanceHistory.length} class dates recorded
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[480px]">
                {attendanceHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No past sessions recorded yet.
                  </div>
                ) : (
                  <div className="divide-y text-xs">
                    {attendanceHistory.map((sess: any) => (
                      <div key={sess._id} className="p-3 hover:bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" /> {sess.date}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {sess.attendanceRate}% Attendance
                          </Badge>
                        </div>
                        {sess.topic && (
                          <p className="text-muted-foreground text-[11px] mt-1 line-clamp-1">
                            {sess.topic}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {sess.presentCount} Present &bull; {sess.lateCount} Late &bull; {sess.absentCount} Absent
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Cumulative Attendance Stats Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Student Attendance & Exam Eligibility (75% Threshold)
              </CardTitle>
              <CardDescription className="text-xs">
                Students below 75% attendance may be barred from sitting the final examination per university policy.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Reg Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Attended / Total</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                    <TableHead className="text-right pr-6">Exam Clearance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                        Attendance summary will appear once sessions are recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentAttendance.map((stat: any) => (
                      <TableRow key={stat.studentId}>
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                          {stat.studentRegNumber}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{stat.studentName}</TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {stat.present + stat.late} / {stat.totalSessions} sessions
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-mono text-xs font-bold ${
                              stat.percentage >= 75 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {stat.percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {stat.isEligibleForExams ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                              Cleared for Exam
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 text-[10px]">
                              Barred (&lt; 75%)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: ROSTER ── */}
        <TabsContent value="roster">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Course Enrollment Directory</CardTitle>
              <CardDescription className="text-xs">
                Official list of students actively registered for this course unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6 w-12">#</TableHead>
                    <TableHead>Registration Number</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Academic Program</TableHead>
                    <TableHead className="text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradebook.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                        No students enrolled in this course unit.
                      </TableCell>
                    </TableRow>
                  ) : (
                    gradebook.students.map((student, idx) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {student.studentRegNumber}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{student.studentName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {course?.programName || "Degree Program"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                            Active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Submission Confirmation Dialog ── */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Gradebook to Head of Department?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are submitting final coursework and exam marks for <strong>{totalStudents} students</strong> in{" "}
                <strong>{course?.code}: {course?.title}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Once submitted, this gradebook will be locked against modifications until reviewed and approved by the Head of Department.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitToHOD}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

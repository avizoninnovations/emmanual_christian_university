"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Check,
  RotateCcw,
  Eye,
  Unlock,
  Users,
  Award,
  Loader2,
  BookOpen,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function MarksReviewQueueView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Inspect Modal State
  const [inspectCourseId, setInspectCourseId] = useState<Id<"courses"> | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const queue = useQuery(api.marks.getHODReviewQueue, {}) || [];
  const activePeriod = useQuery(api.calendar.getActivePeriod);

  // Gradebook for modal inspection
  const inspectedGradebook = useQuery(
    api.marks.getCourseGradebook,
    inspectCourseId ? { courseId: inspectCourseId } : "skip"
  );

  const approveCourseMarks = useMutation(api.marks.approveCourseMarks);
  const returnCourseMarks = useMutation(api.marks.returnCourseMarks);
  const grantUnlock = useMutation(api.marks.grantSingleStudentUnlock);

  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.lecturerName.toLowerCase().includes(search.toLowerCase()) ||
      item.departmentName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingReviewCount = queue.filter((q) => q.status === "submitted").length;
  const approvedCount = queue.filter((q) => q.status === "approved").length;
  const returnedCount = queue.filter((q) => q.status === "returned").length;

  const handleApprove = async (courseId: Id<"courses">) => {
    if (!activePeriod) return;
    try {
      setIsProcessing(true);
      await approveCourseMarks({
        courseId,
        periodId: activePeriod._id,
      });
      toast.success("Marks approved and published to student records");
      if (inspectCourseId === courseId) {
        setInspectCourseId(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve marks");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!activePeriod || !inspectCourseId || !returnReason.trim()) {
      toast.error("Please provide a reason for returning the marks.");
      return;
    }

    try {
      setIsProcessing(true);
      await returnCourseMarks({
        courseId: inspectCourseId,
        periodId: activePeriod._id,
        reason: returnReason.trim(),
      });
      toast.success("Marks returned to instructor for revision");
      setReturnDialogOpen(false);
      setReturnReason("");
      setInspectCourseId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to return marks");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantUnlock = async (assessmentId: Id<"studentAssessments">) => {
    try {
      await grantUnlock({ assessmentId });
      toast.success("Edit grant unlocked for student");
    } catch (err: any) {
      toast.error(err.message || "Failed to grant unlock");
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">HOD Marks Review Queue</h1>
            <Badge variant="outline" className="text-xs">
              Academic Approvals
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review continuous assessments (30%) and final examination marks (70%) submitted by department instructors.
          </p>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{pendingReviewCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Pending HOD Approval
                </p>
              </div>
              <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Clock className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Approved & Finalized
                </p>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-rose-600">{returnedCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Returned for Correction
                </p>
              </div>
              <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                <RotateCcw className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{queue.length}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                  Department Courses
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter & Review Queue Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses or lecturers..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="All Queue Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Queue Status</SelectItem>
                <SelectItem value="submitted">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="draft">Draft (In Progress)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-32">Course Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-center">Graded Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Review Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No gradebooks in the review queue matching the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQueue.map((item) => (
                  <TableRow key={item.courseId} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-mono font-bold text-sm">
                      {item.code}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.programName} &bull; Year {item.yearOfStudy} Sem {item.semester}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold">{item.lecturerName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.lecturerEmail}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.studentCount} Students
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.status === "approved" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          APPROVED
                        </Badge>
                      )}
                      {item.status === "submitted" && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                          SUBMITTED
                        </Badge>
                      )}
                      {item.status === "returned" && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200">
                          RETURNED
                        </Badge>
                      )}
                      {item.status === "draft" && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          DRAFT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectCourseId(item.courseId)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="size-3.5" /> Inspect
                        </Button>

                        {item.status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(item.courseId)}
                            disabled={isProcessing}
                            className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="size-3.5" /> Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Inspection Modal ── */}
      <Dialog open={!!inspectCourseId} onOpenChange={(o) => !o && setInspectCourseId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-sm font-bold">
                    {inspectedGradebook?.course?.code}
                  </Badge>
                  <DialogTitle className="text-xl">
                    {inspectedGradebook?.course?.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="mt-1">
                  Assessing {inspectedGradebook?.students.length || 0} students &bull; Status:{" "}
                  <strong className="uppercase">{inspectedGradebook?.overallStatus}</strong>
                </DialogDescription>
              </div>

              {inspectedGradebook?.overallStatus === "submitted" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReturnDialogOpen(true)}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 gap-1 text-xs"
                  >
                    <RotateCcw className="size-3.5" /> Return with Reason
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => inspectCourseId && handleApprove(inspectCourseId)}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1 text-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Approve All Marks
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-36">Reg Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-24 text-center">CW (30)</TableHead>
                  <TableHead className="w-24 text-center">Exam (70)</TableHead>
                  <TableHead className="w-24 text-center font-bold">Total (100)</TableHead>
                  <TableHead className="w-16 text-center">Grade</TableHead>
                  <TableHead className="w-16 text-center">GP</TableHead>
                  <TableHead className="text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectedGradebook?.students.map((st) => (
                  <TableRow key={st.studentId} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                      {st.studentRegNumber}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {st.studentName}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {st.courseworkMarks}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {st.examMarks}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm">
                      {st.finalScore}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          st.grade === "A"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                            : st.grade === "F"
                            ? "bg-rose-500/10 text-rose-600 border-rose-200"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {st.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {st.gradePoints.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {st.assessmentId && st.status === "approved" && !st.isUnlocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGrantUnlock(st.assessmentId!)}
                          title="Grant 1-time edit unlock to lecturer"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Unlock className="size-3" /> Grant Unlock
                        </Button>
                      )}
                      {st.isUnlocked && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                          Unlocked
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setInspectCourseId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Reason Dialog ── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Marks for Revision</DialogTitle>
            <DialogDescription>
              State the specific feedback or errors detected so the instructor can amend and resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              placeholder="e.g. Please verify coursework scores for students with missing assignments..."
              rows={4}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              disabled={isProcessing || !returnReason.trim()}
            >
              {isProcessing && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Return Marks to Lecturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

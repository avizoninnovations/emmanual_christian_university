"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Send,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function TeachingCoverView() {
  const { roles, user } = useCurrentUser();
  const isHodOrAdmin = roles?.some((r: string) =>
    ["admin", "hod", "dean"].includes(r.toLowerCase())
  );

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [coveringLecturerId, setCoveringLecturerId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0] || "2026-09-18");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");

  const coverData = useQuery(api.teaching_cover.getMyCoverRequests, {});
  const pendingDepartment = useQuery(
    api.teaching_cover.getDepartmentPendingCovers,
    isHodOrAdmin ? {} : "skip"
  );
  const myCourses = useQuery(api.allocations.getLecturerCourses, {});
  const lecturers = useQuery(api.allocations.getDepartmentLecturers, {});
  const periods = useQuery(api.broadsheet.getProgramsAndPeriods);

  const createRequest = useMutation(api.teaching_cover.createCoverRequest);
  const reviewRequest = useMutation(api.teaching_cover.reviewCoverRequest);

  const handleCreateRequest = async () => {
    if (!selectedCourseId || !coveringLecturerId || !topic.trim() || !reason.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const activePeriod = periods?.periods.find((p: any) => p.status === "active") || periods?.periods[0];
    if (!activePeriod) {
      toast.error("No active academic period available.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createRequest({
        courseId: selectedCourseId as Id<"courses">,
        periodId: activePeriod._id,
        coveringLecturerId,
        date,
        startTime,
        endTime,
        topic,
        reason,
      });

      toast.success("Teaching cover request submitted to HOD");
      setRequestDialogOpen(false);
      setTopic("");
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAction = async (action: "approved" | "rejected") => {
    if (!selectedRequestToReview) return;
    try {
      setIsSubmitting(true);
      await reviewRequest({
        id: selectedRequestToReview._id,
        action,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      toast.success(`Teaching cover request ${action}`);
      setReviewDialogOpen(false);
      setSelectedRequestToReview(null);
      setReviewNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to review request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!coverData) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading teaching cover records...</p>
      </div>
    );
  }

  const myRequests = coverData.myRequests || [];
  const coveringForOthers = coverData.coveringForOthers || [];
  const pendingApprovals = pendingDepartment || [];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Lecturer Absence & Teaching Cover
            </h1>
            <Badge variant="outline" className="text-xs uppercase">
              Faculty Workflows
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Formal institutional arrangements for class coverage during pastoral ministry, diocesan missions, and academic travel.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setRequestDialogOpen(true)}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="size-3.5" /> Request Teaching Cover
        </Button>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="my-requests" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="my-requests" className="gap-2">
            <Send className="size-4" />
            My Requests ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="covering" className="gap-2">
            <UserCheck className="size-4" />
            Covering for Colleagues ({coveringForOthers.length})
          </TabsTrigger>
          {isHodOrAdmin && (
            <TabsTrigger value="approvals" className="gap-2">
              <CheckCircle2 className="size-4" />
              HOD Review Queue ({pendingApprovals.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab 1: My Requests ── */}
        <TabsContent value="my-requests">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Outgoing Coverage Requests</CardTitle>
              <CardDescription className="text-xs">
                Classes where you nominated a colleague to cover during your absence.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Date & Time</TableHead>
                    <TableHead>Course Unit</TableHead>
                    <TableHead>Lecture Topic</TableHead>
                    <TableHead>Covering Colleague</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs">
                        No outgoing teaching cover requests recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((r: any) => (
                      <TableRow key={r._id} className="hover:bg-muted/30">
                        <TableCell className="pl-6 font-mono text-xs">
                          <div>{r.date}</div>
                          {r.startTime && (
                            <span className="text-muted-foreground text-[11px]">
                              {r.startTime} – {r.endTime}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-primary">{r.courseCode}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{r.courseTitle}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{r.topic}</TableCell>
                        <TableCell className="text-xs">{r.coveringLecturerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {r.reason}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase ${
                              r.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : r.status === "rejected"
                                ? "bg-rose-500/10 text-rose-600 border-rose-200"
                                : "bg-amber-500/10 text-amber-600 border-amber-200"
                            }`}
                          >
                            {r.status}
                          </Badge>
                          {r.hodReviewNotes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                              &ldquo;{r.hodReviewNotes}&rdquo;
                            </p>
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

        {/* ── Tab 2: Covering for Colleagues ── */}
        <TabsContent value="covering">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Incoming Coverage Schedule</CardTitle>
              <CardDescription className="text-xs">
                Classes where fellow faculty members have nominated you to teach on their behalf.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Date & Time</TableHead>
                    <TableHead>Course Unit</TableHead>
                    <TableHead>Topic to Deliver</TableHead>
                    <TableHead>Requesting Colleague</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right pr-6">HOD Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coveringForOthers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs">
                        You have not been assigned to cover any lectures for colleagues.
                      </TableCell>
                    </TableRow>
                  ) : (
                    coveringForOthers.map((r: any) => (
                      <TableRow key={r._id} className="hover:bg-muted/30">
                        <TableCell className="pl-6 font-mono text-xs">
                          <div>{r.date}</div>
                          {r.startTime && (
                            <span className="text-muted-foreground text-[11px]">
                              {r.startTime} – {r.endTime}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-primary">{r.courseCode}</div>
                          <div className="text-[11px] text-muted-foreground">{r.courseTitle}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{r.topic}</TableCell>
                        <TableCell className="text-xs font-semibold">{r.requesterName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase ${
                              r.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                : r.status === "rejected"
                                ? "bg-rose-500/10 text-rose-600 border-rose-200"
                                : "bg-amber-500/10 text-amber-600 border-amber-200"
                            }`}
                          >
                            {r.status}
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

        {/* ── Tab 3: HOD Approvals ── */}
        {isHodOrAdmin && (
          <TabsContent value="approvals">
            <Card className="shadow-sm border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Department Review Queue</CardTitle>
                <CardDescription className="text-xs">
                  Review and authorize teaching cover requests from departmental academic staff.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lecturer Requesting</TableHead>
                      <TableHead>Nominated Colleague</TableHead>
                      <TableHead>Topic & Reason</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs">
                          No pending teaching cover requests awaiting departmental approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingApprovals.map((r: any) => (
                        <TableRow key={r._id} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-mono text-xs">{r.date}</TableCell>
                          <TableCell className="font-semibold text-xs text-primary">{r.courseCode}</TableCell>
                          <TableCell className="text-xs font-medium">{r.requesterName}</TableCell>
                          <TableCell className="text-xs font-medium text-emerald-600">{r.coveringLecturerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            <div className="font-medium text-foreground">{r.topic}</div>
                            <div className="italic text-[11px]">{r.reason}</div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequestToReview(r);
                                setReviewDialogOpen(true);
                              }}
                              className="h-7 text-xs gap-1 text-primary"
                            >
                              Review Request
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Request Cover Dialog ── */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Teaching Cover</DialogTitle>
            <DialogDescription className="text-xs">
              Nominate a qualified faculty colleague to cover your scheduled lecture.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Course Select */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Course Unit to Cover</label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {myCourses?.map((c) => (
                    <SelectItem key={c.courseId} value={c.courseId} className="text-xs">
                      {c.code}: {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Colleague Select */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Nominate Covering Colleague</label>
              <Select value={coveringLecturerId} onValueChange={setCoveringLecturerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Colleague" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers?.map((l) => (
                    <SelectItem key={l.userId} value={l.userId} className="text-xs">
                      {l.name} ({l.title})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Lecture Topic / Syllabus Unit</label>
              <Input
                placeholder="e.g. Chapter 4: Financial Accounting Principles"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Reason for Absence</label>
              <Textarea
                placeholder="e.g. Pastoral ministry trip to Yei Diocese / Academic conference in Juba"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateRequest}
              disabled={isSubmitting}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review Cover Dialog ── */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">HOD Review: Teaching Cover</DialogTitle>
            <DialogDescription className="text-xs">
              Authorize or decline the faculty coverage request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequestToReview && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <div><strong>Course:</strong> {selectedRequestToReview.courseCode}</div>
                <div><strong>Lecturer:</strong> {selectedRequestToReview.requesterName}</div>
                <div><strong>Covering:</strong> {selectedRequestToReview.coveringLecturerName}</div>
                <div><strong>Date:</strong> {selectedRequestToReview.date}</div>
                <div><strong>Topic:</strong> {selectedRequestToReview.topic}</div>
                <div><strong>Reason:</strong> {selectedRequestToReview.reason}</div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">HOD Remarks (Optional)</label>
                <Input
                  placeholder="e.g. Approved. Please ensure attendance register is collected."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleReviewAction("rejected")}
              disabled={isSubmitting}
              className="gap-1"
            >
              <XCircle className="size-3.5" /> Decline
            </Button>
            <Button
              size="sm"
              onClick={() => handleReviewAction("approved")}
              disabled={isSubmitting}
              className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5" /> Authorize Cover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

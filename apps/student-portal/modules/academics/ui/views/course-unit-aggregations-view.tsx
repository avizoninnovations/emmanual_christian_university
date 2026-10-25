"use client";

import { useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { BookOpen, Clock3, Loader2, Search, Send, UsersRound } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { CourseAggregationRequestDialog } from "../components/course-aggregation-request-dialog";

type Candidate = FunctionReturnType<typeof api.courseUnitAggregations.availableCourses>["courses"][number];
type StudentRequest = FunctionReturnType<typeof api.courseUnitAggregations.myRequests>["page"][number];

export function CourseUnitAggregationsView() {
  const available = useQuery(api.courseUnitAggregations.availableCourses, {});
  const periodId = available?.period?._id;
  const requests = usePaginatedQuery(api.courseUnitAggregations.myRequests, periodId ? { periodId } : "skip", { initialNumItems: 20 });
  const submitRequest = useMutation(api.courseUnitAggregations.submitRequest);
  const withdrawRequest = useMutation(api.courseUnitAggregations.withdrawRequest);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const normalized = search.trim().toLowerCase();
  const courses = useMemo(() => (available?.courses ?? []).filter(course => !normalized || [course.code, course.title, course.programName, course.departmentName, course.lecturerName].some(value => value.toLowerCase().includes(normalized))).sort((left, right) => left.title.localeCompare(right.title)), [available?.courses, normalized]);
  const requestRows = requests.results.filter(request => request.status !== "withdrawn");

  async function send(reason: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await submitRequest({ courseId: selected.courseId, reason });
      toast.success("Your missed-paper request has been sent to the lecturer for review.");
      setDialogOpen(false);
      setSelected(null);
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not submit your request.")); }
    finally { setBusy(false); }
  }

  async function withdraw(request: StudentRequest) {
    setWithdrawing(String(request._id));
    try { await withdrawRequest({ requestId: request._id }); toast.success("Request withdrawn. The lecturer can see that you withdrew it."); }
    catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not withdraw this request.")); }
    finally { setWithdrawing(null); }
  }

  return <main className="min-h-full min-w-0 space-y-4 p-3 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><BookOpen className="size-5 text-primary" /><h1 className="text-xl font-semibold">Missed Paper Request</h1></div>
      {available?.period && <Badge variant="secondary" className="rounded-sm">{available.period.name} {available.period.year}</Badge>}</div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border/60 py-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5"><UsersRound className="size-4" />Lecturer review</span><span>→</span><span className="flex items-center gap-1.5"><Clock3 className="size-4" />HOD decision</span><span>for your missed paper</span>
    </div>
    <Tabs defaultValue="available">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="available" className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">Enrolled course units <span className="ml-1 tabular-nums">{courses.length}</span></TabsTrigger>
        <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">My requests <span className="ml-1 tabular-nums">{requestRows.length}{requests.status === "CanLoadMore" ? "+" : ""}</span></TabsTrigger>
      </TabsList>
      <TabsContent value="available" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">Choose a course unit you are enrolled in this semester to request a missed paper.</p>
        {available?.registrationLoadCapped && <p role="alert" className="rounded-sm bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">Your registration list needs manual verification. Contact the Registrar before submitting a request.</p>}
        <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search your enrolled course units" value={search} onChange={event => setSearch(event.target.value)} /></div>
        {available === undefined ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-36" />)}</div>
          : courses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.map(course => <Card key={course.courseId} className="rounded-sm border-border/70 shadow-none transition-colors hover:border-primary/30">
            <CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{course.code} · {course.creditUnits} CU</p><h2 className="mt-1 line-clamp-2 font-semibold">{course.title}</h2></div><BookOpen className="size-5 shrink-0 text-primary" /></div>
              <p className="text-xs text-muted-foreground">Enrolled in {course.periodName}</p>
              <p className="text-xs text-muted-foreground">{course.lecturerName}</p>
              <Button className="h-9 w-full rounded-sm" disabled={!course.canRequest || course.requestStatus === "pending_lecturer" || course.requestStatus === "pending_hod" || course.requestStatus === "approved"} onClick={() => { setSelected(course); setDialogOpen(true); }}>
                <Send className="mr-2 size-4" />{course.requestStatus === "pending_lecturer" ? "With lecturer" : course.requestStatus === "pending_hod" ? "With HOD" : course.requestStatus === "approved" ? "Approved" : !course.canRequest ? "Unavailable for review" : "Request missed paper"}
              </Button>
            </CardContent>
          </Card>)}</div>
          : <Card className="rounded-sm border-dashed shadow-none"><CardContent className="py-12 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">{available?.registrationLoadCapped ? "Registration verification required." : !available?.period ? "No active Academic Period." : normalized ? "No course units match your search." : "No enrolled course units for this semester."}</p><p className="mt-1 text-sm text-muted-foreground">{available?.registrationLoadCapped ? "The Registrar can confirm your current enrollment before you submit." : !available?.period ? "Requests open when the university starts an active semester." : normalized ? "Try another course code or title." : "Only course units registered in the active semester are shown here."}</p></CardContent></Card>}
      </TabsContent>
      <TabsContent value="requests" className="space-y-3 pt-4">
        {requests.status === "LoadingFirstPage" ? <div className="space-y-3">{[1, 2].map(item => <Skeleton key={item} className="h-28" />)}</div>
          : requestRows.length ? <div className="space-y-3">{requestRows.map(request => <RequestCard key={request._id} request={request} withdrawing={withdrawing === String(request._id)} onWithdraw={() => withdraw(request)} />)}</div>
          : <Card className="rounded-sm border-dashed shadow-none"><CardContent className="py-12 text-center text-sm text-muted-foreground">You have no requests to display.</CardContent></Card>}
        {requests.status === "CanLoadMore" && <div className="flex justify-center"><Button variant="outline" onClick={() => requests.loadMore(20)}>Load older requests</Button></div>}
      </TabsContent>
    </Tabs>
    <CourseAggregationRequestDialog course={selected} open={dialogOpen} busy={busy} onOpenChange={setDialogOpen} onSubmit={send} />
  </main>;
}

function RequestCard({ request, withdrawing, onWithdraw }: { request: StudentRequest; withdrawing: boolean; onWithdraw: () => void }) {
  const labels: Record<StudentRequest["status"], string> = { pending_lecturer: "With lecturer", pending_hod: "With HOD", approved: "Approved", rejected: "Declined", withdrawn: "Withdrawn" };
  const color = request.status === "approved" ? "text-emerald-700 dark:text-emerald-300" : request.status === "rejected" ? "text-destructive" : "text-primary";
  return <Card className="rounded-sm border-border/70 shadow-none"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{request.courseCode} · {request.courseTitle}</h3><Badge variant="secondary" className={`rounded-sm ${color}`}>{labels[request.status]}</Badge></div>
      <p className="mt-1 text-xs text-muted-foreground">{request.periodName} · {request.creditUnits} CU · {request.lecturerName}</p><p className="mt-3 whitespace-pre-wrap text-sm">{request.reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">Requested {new Date(request.requestedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p>
      {request.lecturerDecisionNote && <p className="mt-2 text-sm text-muted-foreground">Lecturer: {request.lecturerDecisionNote}</p>}{request.hodDecisionNote && <p className="mt-2 text-sm text-muted-foreground">HOD: {request.hodDecisionNote}</p>}
    </div>
    {(request.status === "pending_lecturer" || request.status === "pending_hod") && <Button variant="outline" size="sm" className="shrink-0 rounded-sm" disabled={withdrawing} onClick={onWithdraw}>{withdrawing && <Loader2 className="mr-2 size-4 animate-spin" />}Withdraw</Button>}
  </CardContent></Card>;
}

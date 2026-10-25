"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BookOpen, CalendarDays, Loader2 } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

type RetakeData = FunctionReturnType<typeof api.retakeRegistrations.myRetakeOptions>;
type Candidate = RetakeData["courses"][number];
type Registration = RetakeData["registrations"][number];

export function RetakeRegistrationView() {
  const data = useQuery(api.retakeRegistrations.myRetakeOptions, {});
  const register = useMutation(api.retakeRegistrations.register);
  const [attemptPeriod, setAttemptPeriod] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const periods = useMemo(() => [...new Map((data?.courses ?? []).map(course => [course.failedPeriodId, course.failedPeriodName])).entries()], [data?.courses]);
  const courses = (data?.courses ?? []).filter(course => attemptPeriod === "all" || course.failedPeriodId === attemptPeriod);

  async function enroll(course: Candidate) {
    setBusy(course.id);
    try {
      const result = await register({ courseId: course.id });
      toast.success(result.status === "pending_approval" ? "Retake request sent for HOD or Registrar review." : `Registered for ${result.periodName}.`);
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Could not register this retake.")); }
    finally { setBusy(null); }
  }

  return <main className="min-h-full min-w-0 space-y-5 p-3 md:p-5">
    <div className="flex items-center gap-2"><BookOpen className="size-5 text-primary" /><h1 className="text-xl font-semibold">Retake Registration</h1></div>
    {!data ? <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-14 w-full" />)}</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-3">
        <div><p className="text-sm font-medium">Registration period</p><p className="mt-0.5 text-sm text-muted-foreground">{data.period ? `${data.period.name} ${data.period.year}` : "No active or upcoming semester"}{data.period?.status === "upcoming" ? " · Opens next" : ""}</p></div>
        {data.period && <div className="flex flex-wrap gap-2 text-xs"><Badge variant="secondary" className="rounded-sm">On-semester {data.usage.onSemester}/{data.limits.onSemester}</Badge><Badge variant="secondary" className="rounded-sm">Off-semester {data.usage.offSemester}/{data.limits.offSemester}</Badge></div>}
      </div>
      {data.historyCapped && <p role="status" className="rounded-sm bg-amber-500/10 px-3 py-2 text-sm text-amber-800">The displayed history reached its page limit. Contact the Registrar if you need an older attempt checked.</p>}
      <Tabs defaultValue="eligible" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="eligible" className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">Eligible retakes <span className="ml-1 tabular-nums">{courses.length}</span></TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">My registrations <span className="ml-1 tabular-nums">{data.registrations.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="eligible" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm text-muted-foreground">Eligible courses come from approved D or F results in completed semesters. Registration is for the active or next Academic Period shown above. Courses scheduled in that semester register directly; off-semester retakes need HOD or Registrar approval. Missed-exam codes use the special assessment application.</p>
            {periods.length > 1 && <Select value={attemptPeriod} onValueChange={setAttemptPeriod}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filter previous semester" /></SelectTrigger><SelectContent><SelectItem value="all">All previous semesters</SelectItem>{periods.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>}
          </div>
          <div className="w-full overflow-x-auto"><Table>
            <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-14 text-center">#</TableHead><TableHead>Course unit</TableHead><TableHead>Failed semester</TableHead><TableHead>Grade</TableHead><TableHead>Registration type</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>{courses.map((course, index) => <TableRow key={course.id}>
              <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="min-w-52"><span className="block font-medium">{course.title}</span><span className="font-mono text-xs text-muted-foreground">{course.code} · {course.creditUnits} CU</span></TableCell>
              <TableCell>{course.failedPeriodName}</TableCell><TableCell><Badge variant="destructive" className="rounded-sm">{course.grade}</Badge></TableCell>
              <TableCell>{course.mode === null ? "No period selected" : course.mode === "on_semester" ? "On-semester" : "Off-semester · approval required"}</TableCell>
              <TableCell className="text-right"><Button size="sm" className="rounded-sm" disabled={!data.period || busy === course.id} onClick={() => enroll(course)}>{busy === course.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{course.mode === "on_semester" ? "Register retake" : course.mode === "off_semester" ? "Request approval" : "Unavailable"}</Button></TableCell>
            </TableRow>)}
            {courses.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center"><BookOpen className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">No eligible retakes found</p><p className="mt-1 text-xs text-muted-foreground">Eligible courses appear after a published D or F result in a completed semester.</p></TableCell></TableRow>}</TableBody>
          </Table></div>
          {!data.period && <p className="text-sm text-muted-foreground">You can review eligible past results, but registration is closed until an Academic Period is active or upcoming.</p>}
        </TabsContent>
        <TabsContent value="history"><RegistrationHistory registrations={data.registrations} /></TabsContent>
      </Tabs>
    </>}
  </main>;
}

function RegistrationHistory({ registrations }: { registrations: Registration[] }) {
  return <div className="w-full overflow-x-auto"><Table>
    <TableHeader><TableRow className="bg-primary/5 hover:bg-primary/5"><TableHead className="w-14 text-center">#</TableHead><TableHead>Course unit</TableHead><TableHead>Academic Period</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Review note</TableHead></TableRow></TableHeader>
    <TableBody>{registrations.map((registration, index) => <TableRow key={registration._id}>
      <TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="min-w-48"><span className="block font-medium">{registration.courseTitle}</span><span className="font-mono text-xs text-muted-foreground">{registration.courseCode}</span></TableCell>
      <TableCell>{registration.periodName}<span className="block text-xs text-muted-foreground">Failed: {registration.failedPeriodName} · Grade {registration.retakeSourceGrade ?? "—"}</span></TableCell><TableCell>{registration.retakeMode === "off_semester" ? "Off-semester" : "On-semester"}</TableCell>
      <TableCell><RegistrationStatus registration={registration} /></TableCell><TableCell className="max-w-64 whitespace-normal text-sm text-muted-foreground">{registration.retakeDecisionNote ?? "—"}</TableCell>
    </TableRow>)}
    {registrations.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-2 size-5" />No retake registrations yet.</TableCell></TableRow>}</TableBody>
  </Table></div>;
}

function RegistrationStatus({ registration }: { registration: Registration }) {
  if (registration.status === "pending_approval") return <Badge variant="secondary" className="rounded-sm bg-amber-500/10 text-amber-700">Awaiting review</Badge>;
  if (registration.retakeDecision === "rejected") return <Badge variant="secondary" className="rounded-sm bg-destructive/10 text-destructive">Declined</Badge>;
  if (registration.status === "registered") return <Badge variant="secondary" className="rounded-sm bg-emerald-500/10 text-emerald-700">Registered</Badge>;
  if (registration.status === "completed") return <Badge variant="secondary" className="rounded-sm bg-primary/10 text-primary">Completed</Badge>;
  return <Badge variant="secondary" className="rounded-sm">Dropped</Badge>;
}

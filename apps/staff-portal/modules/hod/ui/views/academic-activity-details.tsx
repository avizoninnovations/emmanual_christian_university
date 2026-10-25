"use client";

import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { Activity, BookOpen, CalendarClock, GraduationCap, UserRound } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

type ActivityEvent = FunctionReturnType<typeof api.hod.activity>["page"][number];

export function AcademicActivityDetails({ event, onClose }: { event: ActivityEvent | null; onClose: () => void }) {
  const [tab, setTab] = useState("overview");
  return <Sheet open={!!event} onOpenChange={open => !open && onClose()}>
    <SheetContent className="w-[92vw] overflow-y-auto rounded-l-sm p-0 sm:w-[62.5vw] sm:max-w-none">
      {event && <>
        <SheetHeader className="border-b bg-muted/20 px-6 py-6 pr-14">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary"><Activity className="size-5" /></span>
            <div><SheetTitle className="text-xl">{formatAction(event.action)}</SheetTitle><SheetDescription className="mt-1">{formatActivityTime(event.createdAt)} · {event.actorName}</SheetDescription></div></div>
          <Badge variant="outline" className="w-fit rounded-sm">Event revision {event.revision ?? "—"}</Badge>
        </SheetHeader>
        <div className="px-6 py-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList><TabsTrigger value="overview">Activity details</TabsTrigger><TabsTrigger value="changes">Mark changes</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-6 pt-5">
              <section><SectionTitle icon={UserRound}>Staff activity</SectionTitle><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Staff member" value={event.actorName} /><Detail label="Actor account ID" value={event.actorId} /></dl></section>
              <section><SectionTitle icon={GraduationCap}>Academic context</SectionTitle><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Course unit" value={event.courseLabel} /><Detail label="Student" value={event.studentLabel} />
                <Detail label="Semester" value={event.periodLabel} /><Detail label="Activity type" value={formatAction(event.action)} /></dl></section>
              <section><SectionTitle icon={BookOpen}>Activity note</SectionTitle><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{event.details || "No additional details were recorded."}</p></section>
              <section><SectionTitle icon={CalendarClock}>Record references</SectionTitle><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Event ID" value={event._id} /><Detail label="Created" value={formatActivityTime(event.createdAt)} />
                <Detail label="Revision" value={event.revision?.toString() ?? "Not recorded"} /><Detail label="Edit permission" value={event.grantId ?? "Not linked"} /></dl></section>
            </TabsContent>
            <TabsContent value="changes" className="space-y-4 pt-5">
              {event.before || event.after ? <div className="grid gap-6 md:grid-cols-2">
                <MarkSnapshot title="Before" snapshot={event.before} /><MarkSnapshot title="After" snapshot={event.after} />
              </div> : <p className="rounded-sm bg-muted/30 p-4 text-sm text-muted-foreground">This activity did not record a before-and-after mark snapshot.</p>}
            </TabsContent>
          </Tabs>
        </div>
      </>}
    </SheetContent>
  </Sheet>;
}

function MarkSnapshot({ title, snapshot }: { title: string; snapshot?: ActivityEvent["before"] }) {
  return <section className="space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{snapshot ? <dl className="space-y-3 border-t pt-3">
    <Detail label="Coursework marks" value={snapshot.courseworkMarks.toString()} /><Detail label="Exam marks" value={snapshot.examMarks.toString()} /><Detail label="Result status" value={snapshot.status} />
  </dl> : <p className="text-sm text-muted-foreground">No snapshot recorded.</p>}</section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-b border-border/50 pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Activity; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{children}</h2>;
}

function formatAction(action: string) { return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function formatActivityTime(timestamp: number) { return new Date(timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }); }

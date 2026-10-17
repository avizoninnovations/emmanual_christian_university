"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { CalendarDays, Clock3, MapPin, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

type TimetableType = "lecture" | "exam";

export function StudentTimetableView() {
  const [type, setType] = useState<TimetableType>("lecture");
  const data = useQuery(api.student_portal.getMyTimetable, { type });

  if (data === undefined) {
    return <div className="flex min-h-[420px] flex-col items-center justify-center text-slate-500">
      <Loader2 className="mb-3 size-8 animate-spin text-primary" />
      <p className="text-sm">Loading your timetable...</p>
    </div>;
  }

  return (
    <div className="w-full space-y-6 p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Academics</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">Your registered course schedule and exam sessions.</p>
        </div>
        <div className="mx-auto flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Timetable type">
          {(["lecture", "exam"] as const).map((item) => (
            <Button key={item} role="tab" aria-selected={type === item} variant="ghost"
              onClick={() => setType(item)}
              className={`h-10 rounded-md px-4 text-sm ${type === item ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-slate-600"}`}>
              {item === "lecture" ? <CalendarDays className="mr-2 size-4" /> : <Clock3 className="mr-2 size-4" />}
              {item === "lecture" ? "Lecture Timetable" : "Exam Timetable"}
            </Button>
          ))}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-sm ring-1 ring-slate-200/70">
        <CardHeader className="border-b border-slate-100 bg-primary px-5 py-4 text-primary-foreground sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                {type === "lecture" ? "Teaching Timetable" : "Examination Timetable"}
              </CardTitle>
              <p className="mt-1 text-sm opacity-80">
                {data?.period ? `${data.period.name} ${data.period.year}` : "Current semester"}
              </p>
            </div>
            <CalendarDays className="size-6 text-white/80" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="mb-5 text-sm text-slate-500">Your enrolled course units and retakes are shown together. Retake classes may be in a different programme year.</p>
          {!data?.entries.length ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-10 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                {type === "lecture" ? <CalendarDays className="size-5" /> : <Clock3 className="size-5" />}
              </div>
              <h2 className="font-medium text-slate-800">{type === "lecture" ? "Your timetable is not yet available" : "No exam timetable configured yet"}</h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{type === "lecture" ? "Please check back later or contact your academic advisor." : "Exam sessions will appear here when the university publishes the schedule."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Day / Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Venue</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary"><BookOpen className="size-4" /></span><span><span className="block font-medium text-slate-800">{entry.courseTitle}</span><span className="text-xs text-slate-500">{entry.courseCode}</span></span></div></td>
                      <td className="px-4 py-4"><Badge variant="outline" className="font-medium">{entry.examDate ?? entry.dayOfWeek ?? "—"}</Badge></td>
                      <td className="px-4 py-4 text-slate-600">{entry.startTime} – {entry.endTime}</td>
                      <td className="px-4 py-4 text-slate-600"><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{entry.venue ?? entry.room}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

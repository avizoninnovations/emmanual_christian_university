"use client";

import { CalendarDays, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

/**
 * Academic Calendar View
 *
 * Displays the current active semester and period history.
 * The "Advance Semester" flow (fee rollover, new enrollments) requires
 * backend schema extensions — semester periods table is not yet in the schema.
 * This view is a structured placeholder that will connect once those schema
 * additions are made (P1 backend task).
 */
export const AcademicCalendarView = () => {
  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage semester periods, advance the academic cycle, and track the university calendar.
        </p>
      </div>

      {/* ── Current Active Period ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Academic Period</CardTitle>
              <CardDescription>The globally active semester for all operations</CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
              Active
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">Semester 1 · 2026</p>
                <p className="text-sm text-muted-foreground">1 Aug 2026 — 15 Dec 2026</p>
              </div>
            </div>
            <Button disabled className="gap-2">
              <Clock className="size-4" />
              Advance Semester
              <Badge variant="secondary" className="ml-1 text-[10px]">Coming soon</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Schema Notice ── */}
      <Card className="border border-amber-200 bg-amber-500/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Backend schema required</p>
              <p className="text-sm text-muted-foreground">
                The Academic Calendar module requires adding an <code className="text-xs bg-muted px-1 py-0.5 rounded">academicPeriods</code> table
                to the Convex schema. This table will track: year, semester number, start/end dates, status, and
                link to enrolled student counts. The Advance Semester action will then: close the current period,
                create the next one, roll over fee balances, and create new <code className="text-xs bg-muted px-1 py-0.5 rounded">studentSemesterEnrollments</code>.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["academicPeriods", "studentSemesterEnrollments", "courseRegistrations", "feeStructures"].map(t => (
                  <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Period History Placeholder ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Period History
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-8 pb-8 text-center text-muted-foreground text-sm">
          <CalendarDays className="size-8 mx-auto opacity-20 mb-3" />
          Period history will appear here once the <code className="text-xs bg-muted px-1 py-0.5 rounded">academicPeriods</code> schema is implemented.
        </CardContent>
      </Card>
    </div>
  );
};

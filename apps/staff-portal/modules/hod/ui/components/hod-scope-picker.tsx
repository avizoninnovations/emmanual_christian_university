"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { HodScope } from "../../hooks/use-hod-scope";

export function HodScopePicker({ scope }: { scope: HodScope }) {
  if (!scope.context) return <Skeleton className="h-10 w-full" />;
  if (!scope.context.departments.length) return <p className="p-4 text-sm text-muted-foreground">No HOD appointment is linked to your account. Ask the system administrator to appoint you to a department.</p>;
  return <div className="flex flex-wrap gap-3">
    <Select value={scope.departmentId} onValueChange={scope.setDepartment}><SelectTrigger aria-label="Department" className="w-full sm:w-80"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{scope.context.departments.map(dept => <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>)}</SelectContent></Select>
    <Select value={scope.periodId} onValueChange={scope.setPeriod}><SelectTrigger aria-label="Semester" className="w-full sm:w-72"><SelectValue placeholder="Semester" /></SelectTrigger><SelectContent>{scope.context.periods.map(period => <SelectItem key={period._id} value={period._id}>{period.name} · {period.year} · {period.status}</SelectItem>)}</SelectContent></Select>
  </div>;
}

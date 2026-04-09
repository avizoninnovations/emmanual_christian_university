"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { DepartmentsManager } from "@/modules/academic/ui/components/departments-manager";
import { Building2, School } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function DepartmentsPage() {
  const departments = useQuery(api.academic.getDepartments, {});
  const faculties = useQuery(api.academic.getFaculties);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Academic Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage specialized academic units within their respective faculties.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments?.length ?? "—"}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <School className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculties?.length ?? "—"}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Under Faculties</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <DepartmentsManager />
    </div>
  );
}

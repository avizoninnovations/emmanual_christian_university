"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { ProgramsManager } from "@/modules/academic/ui/components/programs-manager";
import { BookOpen, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function ProgramsPage() {
  const programs = useQuery(api.academic.getPrograms, {});
  const bachelorCount = programs?.filter(p => p.level === "Bachelor").length ?? 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Academic Programs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define and manage the degrees, diplomas, and certificates offered by the university.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{programs?.length ?? "—"}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <GraduationCap className="size-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bachelorCount || "—"}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bachelor Degrees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <ProgramsManager />
    </div>
  );
}

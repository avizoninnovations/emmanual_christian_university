"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { FacultiesManager } from "@/modules/academic/ui/components/faculties-manager";
import { School } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function FacultiesPage() {
  const faculties = useQuery(api.academic.getFaculties);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">University Faculties</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the top-level academic units of the university.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculties?.length ?? "—"}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Faculties</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <FacultiesManager />
    </div>
  );
}

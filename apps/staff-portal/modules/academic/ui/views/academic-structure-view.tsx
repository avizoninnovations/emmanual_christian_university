"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  Trash2, Plus, School, Library, GraduationCap, Loader2,
  Search, Pencil, MoreHorizontal, Building2, BookOpen, Eye, Info
} from "lucide-react";
import { toast } from "sonner";
import { FacultiesManager } from "../components/faculties-manager";
import { DepartmentsManager } from "../components/departments-manager";
import { ProgramsManager } from "../components/programs-manager";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";



// ─────────────────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────────────────

export const AcademicStructureView = () => {
  const faculties = useQuery(api.academic.getFaculties);
  const departments = useQuery(api.academic.getDepartments, {});
  const programs = useQuery(api.academic.getPrograms, {});

  const facultyCount = faculties?.length ?? 0;
  const deptCount = departments?.length ?? 0;
  const programCount = programs?.length ?? 0;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Academic Structure</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the university's faculties, departments, and academic programs.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculties === undefined ? "—" : facultyCount}</p>
                <p className="text-xs text-muted-foreground">Faculties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments === undefined ? "—" : deptCount}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{programs === undefined ? "—" : programCount}</p>
                <p className="text-xs text-muted-foreground">Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="faculties" className="space-y-6">
        <TabsList className="grid w-full sm:w-[480px] grid-cols-3">
          <TabsTrigger value="faculties" className="gap-2">
            <School className="size-3.5" /> Faculties
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="size-3.5" /> Departments
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <BookOpen className="size-3.5" /> Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faculties">
          <FacultiesManager />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentsManager />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};


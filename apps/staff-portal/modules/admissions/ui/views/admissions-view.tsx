"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ApplicantForm } from "../components/applicant-form";
import { ApplicationsPipeline } from "../components/applications-pipeline";
import { SemesterEnrollmentPanel } from "../components/semester-enrollment-panel";

export function AdmissionsView() {
  const [tab, setTab] = useState("applications");
  const [creating, setCreating] = useState(false);

  if (creating)
    return (
      <main className="w-full p-4 md:p-6 xl:p-8">
        <ApplicantForm onBack={() => setCreating(false)} />
      </main>
    );

  return (
    <main className="w-full space-y-5 p-4 md:p-6 xl:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Admissions Office
        </h1>
        {tab === "applications" && (
          <Button className="rounded-sm" onClick={() => setCreating(true)}>
            <UserPlus className="mr-2 size-4" />
            New application
          </Button>
        )}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="applications" className="flex-none">
            Applications
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="flex-none">
            Semester enrollment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="mt-5">
          <ApplicationsPipeline />
        </TabsContent>
        <TabsContent value="enrollment" className="mt-5">
          <SemesterEnrollmentPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

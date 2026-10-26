"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ApplicantForm } from "../components/applicant-form";
import { ApplicationsPipeline } from "../components/applications-pipeline";

export function AdmissionsApplicationsView() {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <main className="w-full p-4 md:p-6 xl:p-8"><ApplicantForm onBack={() => setCreating(false)} /></main>;
  }

  return (
    <main className="w-full space-y-5 p-4 md:p-6 xl:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
        <Button onClick={() => setCreating(true)}><UserPlus className="mr-2 size-4" />New application</Button>
      </div>
      <ApplicationsPipeline />
    </main>
  );
}

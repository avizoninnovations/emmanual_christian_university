"use client";

import { use } from "react";
import { ClassResultsEntryView } from "@/modules/marks/ui/views/class-results-entry-view";
import { Id } from "@workspace/backend/_generated/dataModel";

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const resolvedParams = use(params);

  return (
    <ClassResultsEntryView
      courseId={resolvedParams.courseId as Id<"courses">}
    />
  );
}

"use client";

import { use } from "react";
import { CourseWorkspaceView } from "@/modules/staff/ui/views/course-workspace-view";
import { Id } from "@workspace/backend/_generated/dataModel";

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const resolvedParams = use(params);

  return (
    <CourseWorkspaceView
      courseId={resolvedParams.courseId as Id<"courses">}
    />
  );
}

"use client";

import { AcademicCalendarView } from "@/modules/academic/ui/views/academic-calendar-view";
import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";

export default function AcademicCalendarPage() {
  return (
    <AdminGuard>
      <AcademicCalendarView />
    </AdminGuard>
  );
}

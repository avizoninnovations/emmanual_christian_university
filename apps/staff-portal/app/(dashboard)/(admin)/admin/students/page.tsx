"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { StudentsView } from "@/modules/students/ui/views/students-view";

export default function StudentsPage() {
  return (
    <AdminGuard>
      <StudentsView />
    </AdminGuard>
  );
}

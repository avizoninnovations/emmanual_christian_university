"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { AcademicStructureView } from "@/modules/academic/ui/views/academic-structure-view";

export default function AcademicStructurePage() {
  return (
    <AdminGuard>
      <AcademicStructureView />
    </AdminGuard>
  );
}

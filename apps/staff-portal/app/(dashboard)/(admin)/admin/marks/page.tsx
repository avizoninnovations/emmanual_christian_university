"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { MarksView } from "@/modules/marks/ui/views/marks-view";

export default function MarksPage() {
  return (
    <AdminGuard>
      <MarksView />
    </AdminGuard>
  );
}

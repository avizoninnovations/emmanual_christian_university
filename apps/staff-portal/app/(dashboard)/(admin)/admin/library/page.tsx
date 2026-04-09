"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { LibraryView } from "@/modules/library/ui/views/library-view";

export default function LibraryPage() {
  return (
    <AdminGuard>
      <LibraryView />
    </AdminGuard>
  );
}

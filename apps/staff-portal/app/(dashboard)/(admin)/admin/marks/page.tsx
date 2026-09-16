"use client";

import { AdminGuard } from "@/modules/auth/ui/components/admin-guard";
import { MarksReviewQueueView } from "@/modules/hod/ui/views/marks-review-queue-view";

export default function MarksPage() {
  return (
    <AdminGuard>
      <MarksReviewQueueView />
    </AdminGuard>
  );
}

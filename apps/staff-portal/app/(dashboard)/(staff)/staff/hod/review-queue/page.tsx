import { MarksReviewQueueView } from "@/modules/hod/ui/views/marks-review-queue-view";

export const metadata = {
  title: "Marks Review Queue | ECU HOD Workspace",
  description: "Review, approve, and return course gradebooks submitted by departmental lecturers.",
};

export default function ReviewQueuePage() {
  return <MarksReviewQueueView />;
}

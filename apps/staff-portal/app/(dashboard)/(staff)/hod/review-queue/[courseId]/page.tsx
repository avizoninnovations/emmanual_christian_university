import { ClassReviewRoute } from "@/modules/hod/ui/views/class-review-route";
export const metadata = { title: "Class Marks | ECU Staff" };
export default function ClassReviewPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ periodId?: string }> }) {
  return <ClassReviewRoute params={params} searchParams={searchParams} />;
}

import { CourseAllocationView } from "@/modules/hod/ui/views/course-allocation-view";

export const metadata = {
  title: "Course Allocations | ECU HOD Workspace",
  description: "Assign departmental courses to academic faculty and instructors.",
};

export default function AllocationsPage() {
  return <CourseAllocationView />;
}

import { StudentCoursesView } from "@/modules/academics/ui/views/student-courses-view";

export const metadata = {
  title: "My Enrolled Courses | ECU Student Portal",
  description: "View registered academic courses, instructors, and credit units.",
};

export default function StudentCoursesPage() {
  return <StudentCoursesView />;
}

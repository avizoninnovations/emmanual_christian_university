import { LecturerCourseUnitsView } from "@/modules/staff/ui/views/lecturer-course-units-view";

export const metadata = {
  title: "My Teaching Courses | ECU Staff Portal",
  description: "Manage continuous assessment marks, final exams, and teaching curriculum.",
};

export default function LecturerCoursesPage() {
  return <LecturerCourseUnitsView />;
}

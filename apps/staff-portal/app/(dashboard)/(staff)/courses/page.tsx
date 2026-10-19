import { LecturerCoursesView } from "@/modules/staff/ui/views/lecturer-courses-view";

export const metadata = {
  title: "My Teaching Courses | ECU Staff Portal",
  description: "Manage continuous assessment marks, final exams, and teaching curriculum.",
};

export default function LecturerCoursesPage() {
  return <LecturerCoursesView />;
}

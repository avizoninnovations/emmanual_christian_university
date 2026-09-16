import { CourseRegistrationView } from "@/modules/academics/ui/views/course-registration-view";

export const metadata = {
  title: "Course Registration | ECU Student Portal",
  description: "Enroll in semester course units and manage academic credit load.",
};

export default function RegistrationPage() {
  return <CourseRegistrationView />;
}

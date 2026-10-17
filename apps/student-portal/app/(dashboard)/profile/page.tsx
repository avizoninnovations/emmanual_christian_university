import { StudentProfileView } from "@/modules/dashboard/ui/views/student-profile-view";

export const metadata = {
  title: "My Profile | ECU Student Portal",
  description: "View your student and academic profile.",
};

export default function StudentProfilePage() {
  return <StudentProfileView />;
}

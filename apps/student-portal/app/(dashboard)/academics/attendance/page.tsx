import { StudentAttendanceView } from "@/modules/academics/ui/views/student-attendance-view";

export const metadata = {
  title: "Class Attendance & Eligibility | ECU Student Portal",
  description: "Track lecture attendance rates and university 75% exam policy compliance.",
};

export default function AttendancePage() {
  return <StudentAttendanceView />;
}

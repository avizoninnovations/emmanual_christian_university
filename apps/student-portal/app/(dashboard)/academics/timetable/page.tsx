import { StudentTimetableView } from "@/modules/academics/ui/views/student-timetable-view";

export const metadata = {
  title: "My Timetable | ECU Student Portal",
  description: "View lecture and examination schedules for your registered courses.",
};

export default function TimetablePage() {
  return <StudentTimetableView />;
}

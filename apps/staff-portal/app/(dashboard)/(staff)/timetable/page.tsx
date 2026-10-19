import { LecturerTimetableView } from "@/modules/staff/ui/views/lecturer-timetable-view";

export const metadata = {
  title: "Teaching Timetable | Emmanuel Christian University",
  description: "Weekly lecture schedule grid and room allocations",
};

export default function LecturerTimetablePage() {
  return <LecturerTimetableView />;
}

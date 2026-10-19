import { Suspense } from "react";
import { LecturerAttendanceView } from "@/modules/staff/ui/views/lecturer-attendance-view";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Class Attendance & Roll Call | ECU Staff Portal",
  description: "Record daily lecture sessions and track student attendance eligibility.",
};

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <LecturerAttendanceView />
    </Suspense>
  );
}

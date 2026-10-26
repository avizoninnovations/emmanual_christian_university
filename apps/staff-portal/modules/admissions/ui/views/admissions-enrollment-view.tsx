import { SemesterEnrollmentPanel } from "../components/semester-enrollment-panel";

export function AdmissionsEnrollmentView() {
  return (
    <main className="w-full space-y-5 p-4 md:p-6 xl:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Semester Enrollment</h1>
      <SemesterEnrollmentPanel />
    </main>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Loader2 } from "lucide-react";
import { semesterProgress } from "@/lib/calculators/semester-progress";
import {
  AcademicJourneyCard,
  ResultsAccessCard,
  SemesterStandingCard,
  SemesterTimeline,
  StudentDashboardHeader,
  StudentCoursesSection,
} from "../components/student-dashboard-sections";

export function StudentDashboardView() {
  const profile = useQuery(api.student_portal.getMyProfile);
  const courses = useQuery(api.student_portal.getMyRegisteredCourses, {});
  const journey = useQuery(api.student_dashboard.getMyJourney);
  const permit = useQuery(api.student_portal.getExaminationClearanceCard);

  if (profile === undefined || courses === undefined || journey === undefined || permit === undefined) {
    return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }
  if (!profile || !journey) {
    return <p className="p-8 text-muted-foreground">Your student profile is not available. Contact the Academic Registrar.</p>;
  }

  const currentCourses = courses.filter(course => course.status === "registered");
  const totalUnits = currentCourses.reduce((sum, course) => sum + course.creditUnits, 0);
  const feesPercentage = profile.financial.totalBilled > 0
    ? Math.min(100, Math.round(profile.financial.totalPaid / profile.financial.totalBilled * 100))
    : 0;
  const progress = semesterProgress(journey.periodDates?.startDate, journey.periodDates?.endDate, Date.now());
  const completion = journey.totalCourses ? Math.round(journey.completedCourses / journey.totalCourses * 100) : 0;
  const periodLabel = `${profile.currentPeriod?.name ?? "Current semester"} ${profile.currentPeriod?.year ?? ""}`.trim();

  return (
    <main className="space-y-5 p-5 sm:p-6 lg:p-8">
      <StudentDashboardHeader
        profile={profile}
        periodLabel={periodLabel}
        feesPercentage={feesPercentage}
        semesterPercentage={progress.percentage}
        elapsedDays={progress.elapsed}
        semesterDays={progress.days}
        week={progress.week}
        weeks={progress.weeks}
      />
      <StudentCoursesSection courses={currentCourses} />
      <section className="grid gap-4 xl:grid-cols-3">
        <SemesterStandingCard
          periodLabel={periodLabel}
          onSemester={profile.onSemester}
          startDate={journey.periodDates?.startDate}
          endDate={journey.periodDates?.endDate}
          courseCount={currentCourses.length}
          totalUnits={totalUnits}
          coreCount={currentCourses.filter(course => course.category === "core").length}
          electiveCount={currentCourses.filter(course => course.category === "elective").length}
          foundationCount={currentCourses.filter(course => course.category === "foundation").length}
          semesterPercentage={progress.percentage}
        />
        <AcademicJourneyCard
          completion={completion}
          completedCourses={journey.completedCourses}
          totalCourses={journey.totalCourses}
          semesters={journey.semesters}
          passed={journey.passed}
          failed={journey.failed}
          cgpa={profile.academics.cgpa}
        />
        <ResultsAccessCard
          courseworkEntered={journey.courseworkEntered}
          finalsApproved={journey.finalsApproved}
          registeredCount={currentCourses.length}
          permitAvailable={permit?.isCleared ?? false}
        />
      </section>
      <SemesterTimeline periods={journey.timeline} />
    </main>
  );
}

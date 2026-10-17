"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { BookOpen, GraduationCap, CalendarDays, Wallet, Loader2, Mail, Phone, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { semesterProgress } from "@/lib/calculators/semester-progress";

export function StudentDashboardView() {
  const profile = useQuery(api.student_portal.getMyProfile);
  const courses = useQuery(api.student_portal.getMyRegisteredCourses, {});
  const journey = useQuery(api.student_dashboard.getMyJourney);
  const permit = useQuery(api.student_portal.getExaminationClearanceCard);
  if (profile === undefined || courses === undefined || journey === undefined) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (!profile || !journey) return <p className="p-8 text-muted-foreground">Your student profile is not available. Contact the Academic Registrar.</p>;
  const currentCourses = courses.filter(course => course.status === "registered");
  const totalUnits = currentCourses.reduce((sum, course) => sum + course.creditUnits, 0);
  const feesPercentage = profile.financial.totalBilled > 0 ? Math.min(100, Math.round(profile.financial.totalPaid / profile.financial.totalBilled * 100)) : 0;
  const periodProgress = semesterProgress(journey.periodDates?.startDate, journey.periodDates?.endDate, Date.now());
  const completion = journey.totalCourses ? Math.round(journey.completedCourses / journey.totalCourses * 100) : 0;
  const periodLabel = `${profile.currentPeriod?.name ?? "Current semester"} ${profile.currentPeriod?.year ?? ""}`;
  return <div className="space-y-5 p-5 sm:p-6 lg:p-8">
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="flex justify-between bg-primary px-6 py-3 text-primary-foreground"><span className="flex items-center gap-2 text-sm"><GraduationCap className="size-5" />CGPA {profile.academics.cgpa.toFixed(2)}</span><Badge variant="secondary">{profile.onSemester ? "On-semester" : "Off-semester"}</Badge></div>
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar className="size-24 shrink-0"><AvatarImage src={profile.imageUrl ?? undefined} alt={profile.name} /><AvatarFallback className="bg-primary/10 text-2xl text-primary">{profile.name.split(" ").map((part: string) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
        <div className="flex-1 space-y-2"><p className="text-xs font-semibold tracking-wide text-muted-foreground">WELCOME BACK STUDENT</p><h1 className="text-2xl font-bold">{profile.name}</h1><p className="font-medium">{profile.program.name}</p><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Mail className="size-4" />{profile.email}</span><span className="flex items-center gap-2"><Phone className="size-4" />{profile.phone || "—"}</span></div></div>
        <Button asChild size="sm"><Link href="/academics/courses">View courses<ArrowRight className="size-4" /></Link></Button>
      </CardContent>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Access number", profile.accessNumber || "—"], ["Reg. number", profile.registrationNumber], ["Current year", String(profile.yearOfStudy)], ["Current semester", String(profile.semester)]].map(([label, value]) => <Card key={label} className="shadow-sm"><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-2 break-words font-semibold">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={GraduationCap} label="Cumulative CGPA" value={profile.academics.cgpa.toFixed(2)} note={profile.academics.academicStanding} />
      <Metric icon={Wallet} label={`Tuition · ${periodLabel}`} value={`${feesPercentage}%`} note="fees paid" progress={feesPercentage} />
      <Metric icon={CalendarDays} label={`Semester · ${periodLabel}`} value={`${periodProgress.percentage}%`} note={`${periodProgress.elapsed} of ${periodProgress.days} days`} progress={periodProgress.percentage} />
      <Metric icon={CalendarDays} label={`Weeks · ${periodLabel}`} value={`${periodProgress.week}/${periodProgress.weeks}`} note="weeks" />
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Card className="shadow-sm"><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Current semester courses</CardTitle><Button asChild size="sm" variant="ghost"><Link href="/academics/courses">View courses</Link></Button></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
        {currentCourses.length === 0 && <p className="p-4 text-sm text-muted-foreground">No course units enrolled this semester.</p>}
        {currentCourses.map(course => <Link href="/academics/courses" key={course.registrationId} className="rounded-lg border p-4 transition-colors hover:bg-muted/40"><BookOpen className="mb-3 size-6 text-primary" /><h3 className="font-semibold">{course.title}</h3><div className="my-2 flex flex-wrap gap-2 text-xs"><span>{course.code}</span><Badge variant="secondary">{course.creditUnits} CU</Badge><Badge variant="outline" className="uppercase">{course.category}</Badge></div><p className="text-xs text-muted-foreground">Lecturer: {course.lecturerName}</p></Link>)}
      </CardContent></Card>
      <div className="space-y-4">
        <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Semester Standing</CardTitle></CardHeader><CardContent className="space-y-3"><p className="font-bold uppercase">{periodLabel}</p><p className="text-xs text-muted-foreground">{journey.periodDates?.startDate} – {journey.periodDates?.endDate}</p><Badge variant="secondary">{profile.onSemester ? "On-semester" : "Off-semester"}</Badge><dl className="grid grid-cols-4 gap-2 text-center text-sm">{[["Courses", currentCourses.length], ["Units", totalUnits], ["Core", currentCourses.filter(course => course.category === "core").length], ["Electives", currentCourses.filter(course => course.category === "elective").length]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl></CardContent></Card>
        <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Academic Journey</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-3xl font-bold">{completion}%</p><p className="text-xs text-muted-foreground">course completion · {journey.completedCourses} / {journey.totalCourses} courses</p><Progress value={completion} /><div className="flex justify-between text-xs"><span>Remaining {Math.max(0, journey.totalCourses - journey.completedCourses)}</span><span>Sems {journey.semesters}</span></div><p className="text-xs">Passed {journey.passed} · Failed {journey.failed}</p></CardContent></Card>
        <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Results Access</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="flex justify-between"><span>Coursework</span><span>{journey.courseworkEntered}/{currentCourses.length} entered</span></p><p className="flex justify-between"><span>Finals</span><span>{journey.finalsApproved}/{currentCourses.length} approved</span></p><p className="flex justify-between"><span>Permit</span><Link href="/finance/exam-card" className="font-medium text-primary">{permit?.isCleared ? "Available" : "Check clearance"}</Link></p></CardContent></Card>
      </div>
    </div>
    <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Semester Timeline</CardTitle><p className="text-sm text-muted-foreground">Registered semesters are shown from first to latest.</p></CardHeader><CardContent><ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{journey.timeline.map((period, index) => <li key={period.id} className="flex gap-3 rounded-lg border p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span><div className="space-y-1 text-sm"><p className="font-semibold">{period.name} {period.year}</p><p className="text-xs text-muted-foreground">Year {period.yearOfStudy} · Sem {period.semester} · {period.startDate} – {period.endDate}</p><p className="text-xs">{period.gpa !== null ? `GPA ${period.gpa.toFixed(2)} · ` : ""}{period.feesPercentage}% fees</p></div></li>)}</ol></CardContent></Card>
  </div>;
}

function Metric({ icon: Icon, label, value, note, progress }: { icon: typeof GraduationCap; label: string; value: string; note: string; progress?: number }) {
  return <Card className="shadow-sm"><CardContent className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs uppercase text-muted-foreground">{label}</p><Icon className="size-5 shrink-0 text-primary" /></div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{note}</p>{progress !== undefined && <Progress value={progress} />}</CardContent></Card>;
}

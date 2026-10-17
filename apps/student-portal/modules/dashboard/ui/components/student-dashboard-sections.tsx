import Link from "next/link";
import {
  ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, ExternalLink,
  GraduationCap, History, Mail, Phone, ShieldCheck, Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";

interface DashboardProfile {
  name: string;
  email: string;
  phone: string;
  imageUrl: string | null;
  accessNumber: string;
  registrationNumber: string;
  yearOfStudy: number;
  semester: number;
  onSemester: boolean;
  program: { name: string };
  academics: { cgpa: number; academicStanding: string };
}

interface DashboardCourse {
  registrationId: string;
  title: string;
  code: string;
  creditUnits: number;
  category: string;
  lecturerName: string;
  moodleUrl: string | null;
}

interface TimelinePeriod {
  id: string;
  name: string;
  year: number;
  yearOfStudy: number;
  semester: number;
  startDate: string;
  endDate: string;
  gpa: number | null;
  feesPercentage: number;
}

const softCard = "border-0 bg-card shadow-sm ring-1 ring-foreground/5";

export function StudentDashboardHeader({
  profile, periodLabel, feesPercentage, semesterPercentage, elapsedDays, semesterDays, week, weeks,
}: {
  profile: DashboardProfile;
  periodLabel: string;
  feesPercentage: number;
  semesterPercentage: number;
  elapsedDays: number;
  semesterDays: number;
  week: number;
  weeks: number;
}) {
  const identity = [
    { label: "Access number", value: profile.accessNumber || "—", icon: GraduationCap },
    { label: "Reg. number", value: profile.registrationNumber, icon: CheckCircle2 },
    { label: "Current year", value: String(profile.yearOfStudy), icon: GraduationCap },
    { label: "Current semester", value: String(profile.semester), icon: CalendarDays },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(400px,0.88fr)]">
      <Card className="relative overflow-hidden border-0 bg-primary text-primary-foreground shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-primary-foreground/5" />
        <CardContent className="relative flex min-h-[310px] flex-col items-start justify-center gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <Avatar className="size-24 shrink-0 ring-4 ring-primary-foreground/15">
            <AvatarImage src={profile.imageUrl ?? undefined} alt={profile.name} />
            <AvatarFallback className="bg-primary-foreground/15 text-2xl text-primary-foreground">
              {profile.name.split(" ").map(part => part[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold tracking-wide text-primary-foreground/75">WELCOME BACK STUDENT</p>
              <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/10">
                {profile.onSemester ? "On-semester" : "Off-semester"}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.name}</h1>
            <p className="font-semibold text-primary-foreground/90">{profile.program.name}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-2"><Mail className="size-4" />{profile.email}</span>
              <span className="flex items-center gap-2"><Phone className="size-4" />{profile.phone || "—"}</span>
            </div>
            <Button asChild size="sm" variant="secondary" className="mt-1">
              <Link href="/academics/courses">View courses<ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm">
          {identity.map(({ label, value, icon: Icon }, index) => (
            <div key={label} className={`flex min-h-[70px] items-center gap-3 p-3 sm:p-4 ${index % 2 ? "border-l border-primary-foreground/10" : ""} ${index > 1 ? "border-t border-primary-foreground/10" : ""}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15"><Icon className="size-5" /></span>
              <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-primary-foreground/70">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={GraduationCap} label="Cumulative CGPA" value={profile.academics.cgpa.toFixed(2)} note={profile.academics.academicStanding} />
          <Metric icon={Wallet} label={`Tuition · ${periodLabel}`} value={`${feesPercentage}%`} note="fees paid" progress={feesPercentage} />
          <Metric icon={CalendarDays} label={`Semester · ${periodLabel}`} value={`${semesterPercentage}%`} note={`${elapsedDays} of ${semesterDays} days`} progress={semesterPercentage} />
          <Metric icon={Clock3} label={`Weeks · ${periodLabel}`} value={`${week}/${weeks}`} note="weeks" />
        </div>
      </div>
    </section>
  );
}

export function StudentCoursesSection({ courses }: { courses: DashboardCourse[] }) {
  return (
    <Card className={softCard}>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-4">
        <CardTitle className="flex items-center gap-3 text-base"><SectionIcon icon={BookOpen} />Current semester courses</CardTitle>
        <Button asChild size="sm" variant="outline"><Link href="/academics/courses">View courses<ArrowRight className="size-4" /></Link></Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {courses.length === 0 && <p className="p-4 text-sm text-muted-foreground">No course units enrolled this semester.</p>}
        {courses.map((course, index) => (
          <article key={course.registrationId} className="relative min-h-32 overflow-hidden rounded-md bg-background p-4 pl-5 shadow-sm ring-1 ring-border/60 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-primary">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
                  {course.moodleUrl && <a href={course.moodleUrl} target="_blank" rel="noreferrer" aria-label={`Open ${course.title} course site`} className="rounded-full bg-muted p-1.5 text-primary hover:bg-primary/10"><ExternalLink className="size-4" /></a>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{course.code}</span><span>{course.creditUnits} CU</span>
                  <Badge variant="secondary" className="h-5 text-[10px] uppercase">{course.category}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Lecturer:</span> {course.lecturerName}</p>
              </div>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

export function SemesterStandingCard({
  periodLabel, onSemester, startDate, endDate, courseCount, totalUnits, coreCount, electiveCount, foundationCount, semesterPercentage,
}: {
  periodLabel: string; onSemester: boolean; startDate?: string; endDate?: string;
  courseCount: number; totalUnits: number; coreCount: number; electiveCount: number;
  foundationCount: number; semesterPercentage: number;
}) {
  const stats = [["Courses", courseCount], ["Units", totalUnits], ["Core", coreCount], ["Electives", electiveCount]] as const;
  return <Card className={softCard}>
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-3 text-base"><SectionIcon icon={CheckCircle2} />Semester Standing</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Current</p><p className="mt-1 font-bold uppercase">{periodLabel}</p></div><Badge variant={onSemester ? "secondary" : "outline"}>{onSemester ? "On-semester" : "Off-semester"}</Badge></div>
      <p className="text-xs text-muted-foreground">{startDate || "Dates pending"}{endDate ? ` – ${endDate}` : ""}</p>
      <div className="grid grid-cols-4 gap-2">{stats.map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold tabular-nums">{value}</p></div>)}</div>
      <Progress value={semesterPercentage} />
      <p className="text-xs text-muted-foreground">{foundationCount} foundation course{foundationCount === 1 ? "" : "s"}</p>
    </CardContent>
  </Card>;
}

export function AcademicJourneyCard({ completion, completedCourses, totalCourses, semesters, passed, failed, cgpa }: {
  completion: number; completedCourses: number; totalCourses: number; semesters: number;
  passed: number; failed: number; cgpa: number;
}) {
  return <Card className={softCard}>
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-3 text-base"><SectionIcon icon={History} />Academic Journey</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-end justify-between"><div><p className="text-3xl font-bold">{completion}%</p><p className="text-xs text-muted-foreground">course completion</p></div><p className="font-semibold">{completedCourses}/{totalCourses}<span className="ml-1 text-xs font-normal text-muted-foreground">courses</span></p></div>
      <Progress value={completion} />
      <div className="grid grid-cols-3 gap-3 text-xs"><div><p className="text-muted-foreground">Remaining</p><p className="mt-1 font-bold">{Math.max(0, totalCourses - completedCourses)}</p></div><div><p className="text-muted-foreground">CGPA</p><p className="mt-1 font-bold">{cgpa.toFixed(2)}</p></div><div><p className="text-muted-foreground">Semesters</p><p className="mt-1 font-bold">{semesters}</p></div></div>
      <p className="text-xs text-muted-foreground">Passed {passed} · Failed {failed}</p>
    </CardContent>
  </Card>;
}

export function ResultsAccessCard({ courseworkEntered, finalsApproved, registeredCount, permitAvailable }: {
  courseworkEntered: number; finalsApproved: number; registeredCount: number; permitAvailable: boolean;
}) {
  return <Card className={softCard}>
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-3 text-base"><SectionIcon icon={ShieldCheck} />Results Access</CardTitle></CardHeader>
    <CardContent className="divide-y divide-border/60">
      <ResultRow title="Coursework" detail={`${courseworkEntered}/${registeredCount} entered`} status={courseworkEntered ? "In progress" : "Not entered"} />
      <ResultRow title="Finals" detail={`${finalsApproved}/${registeredCount} approved`} status={finalsApproved ? "In progress" : "Not ready"} />
      <Link href="/finance/exam-card" className="flex items-center justify-between gap-3 py-3 hover:text-primary"><div><p className="font-semibold">Permit</p><p className="text-xs text-muted-foreground">{permitAvailable ? "Exam permit available" : "Check clearance"}</p></div><Badge variant={permitAvailable ? "secondary" : "outline"}>{permitAvailable ? "Available" : "Pending"}</Badge></Link>
      <p className="pt-3 text-xs text-muted-foreground">Results history: {finalsApproved}/{registeredCount} approved</p>
    </CardContent>
  </Card>;
}

function ResultRow({ title, detail, status }: { title: string; detail: string; status: string }) {
  return <div className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div><Badge variant="outline">{status}</Badge></div>;
}

export function SemesterTimeline({ periods }: { periods: TimelinePeriod[] }) {
  const first = periods[0];
  const latest = periods[periods.length - 1];
  return <Card className={softCard}>
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
      <div><CardTitle className="flex items-center gap-3 text-base"><SectionIcon icon={History} />Semester Timeline</CardTitle><p className="mt-2 text-xs text-muted-foreground">Registered semesters are shown from first to latest.</p></div>
      <div className="flex gap-2">{first && <Badge variant="outline">Started {first.name} {first.year}</Badge>}{latest && <Badge variant="outline">Latest {latest.name} {latest.year}</Badge>}</div>
    </CardHeader>
    <CardContent>
      {periods.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Your registered semesters will appear here.</p> :
        <ol className="flex gap-4 overflow-x-auto pb-2">{periods.map((period, index) => <li key={period.id} className="relative min-w-64 flex-1 rounded-md bg-background p-4 pt-5 shadow-sm ring-1 ring-border/60">
          <span className="absolute -top-3 left-4 flex size-7 items-center justify-center rounded-full bg-background text-sm font-semibold text-primary ring-2 ring-primary/20">{index + 1}</span>
          <p className="font-bold uppercase">{period.name} {period.year}</p>
          <p className="mt-1 text-xs text-muted-foreground">Year {period.yearOfStudy} · Semester {period.semester} · {period.startDate} – {period.endDate}</p>
          <Badge variant="secondary" className="mt-3">{period.feesPercentage}% fees</Badge>
          {period.gpa !== null && <span className="ml-2 text-xs text-muted-foreground">GPA {period.gpa.toFixed(2)}</span>}
        </li>)}</ol>}
    </CardContent>
  </Card>;
}

function Metric({ icon: Icon, label, value, note, progress }: {
  icon: typeof GraduationCap; label: string; value: string; note: string; progress?: number;
}) {
  return <Card className={softCard}><CardContent className="relative min-h-[96px] space-y-1.5 p-3.5 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-primary">
    <div className="flex items-start justify-between gap-2"><p className="text-[10px] uppercase leading-tight tracking-wide text-muted-foreground">{label}</p><Icon className="size-5 shrink-0 text-primary" /></div>
    <div className="flex items-end justify-between gap-2"><p className="text-xl font-bold leading-none">{value}</p><p className="text-[10px] text-muted-foreground">{note}</p></div>
    {progress !== undefined && <Progress value={progress} className="mt-2 h-1" />}
  </CardContent></Card>;
}

function SectionIcon({ icon: Icon }: { icon: typeof BookOpen }) {
  return <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span>;
}

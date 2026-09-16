"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  ShieldCheck,
  Printer,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building2,
  CalendarCheck,
  DollarSign,
  UserCheck,
  Loader2,
  FileCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export function ExamClearanceCardView() {
  const cardData = useQuery(api.student_portal.getExaminationClearanceCard);

  if (!cardData) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Verifying examination clearance eligibility...</p>
      </div>
    );
  }

  const { isCleared, roadblocks, cardSerial, issuedAt, student, period, courses, financialSummary } =
    cardData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full print:p-0">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Examination Clearance Card</h1>
            <Badge
              variant="outline"
              className={
                isCleared
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  : "bg-rose-500/10 text-rose-600 border-rose-200"
              }
            >
              {isCleared ? "CLEARED FOR EXAMINATIONS" : "CLEARANCE PENDING"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Official university entrance slip for sitting semester final examinations.
          </p>
        </div>

        {isCleared && (
          <Button onClick={handlePrint} className="gap-1.5 bg-primary text-primary-foreground">
            <Printer className="size-3.5" /> Print Examination Card
          </Button>
        )}
      </div>

      {/* ── Roadblock Notification if NOT Cleared ── */}
      {!isCleared && (
        <Card className="border-rose-200 bg-rose-500/10 shadow-xs print:hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3.5">
              <div className="size-9 rounded-lg bg-rose-600/10 flex items-center justify-center text-rose-600 shrink-0">
                <Lock className="size-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-rose-900 dark:text-rose-300">
                  Examination Clearance Incomplete
                </h3>
                <p className="text-xs text-rose-800 dark:text-rose-400">
                  Per South Sudan Higher Education standards, you cannot be issued an Examination Card until both mandatory clearance gates are satisfied:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-rose-800 dark:text-rose-400 font-medium">
                  {roadblocks.map((rb, idx) => (
                    <li key={idx}>{rb}</li>
                  ))}
                </ul>
                <div className="pt-2 flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-rose-300 text-rose-800 hover:bg-rose-100">
                    <Link href="/finance">Go to Finance & Payments</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-rose-300 text-rose-800 hover:bg-rose-100">
                    <Link href="/academics/attendance">Review Attendance</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── THE OFFICIAL EXAMINATION CLEARANCE CARD ── */}
      <div
        className={`border-2 rounded-xl bg-card p-8 space-y-6 shadow-md relative overflow-hidden transition-all ${
          !isCleared ? "opacity-40 grayscale pointer-events-none select-none" : "border-primary/40"
        }`}
      >
        {/* Security Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
          <span className="text-8xl font-black rotate-[-30deg] tracking-widest text-foreground">
            ECU EXAM PASS
          </span>
        </div>

        {/* ── University Official Letterhead ── */}
        <div className="border-b-2 border-primary/20 pb-5 text-center relative">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="flex aspect-square size-14 items-center justify-center overflow-hidden">
              <Image src="/icon.png" alt="ECU Logo" width={56} height={56} className="object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                EMMANUEL CHRISTIAN UNIVERSITY
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                OFFICE OF THE ACADEMIC REGISTRAR &bull; YEI / GOLI, SOUTH SUDAN
              </p>
            </div>
          </div>
          <div className="inline-block bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mt-1">
            Official Examination Clearance Card &bull; {period.name} ({period.year})
          </div>
        </div>

        {/* ── Candidate Profile & Verification Serial ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-muted/40 p-4 rounded-lg border">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Candidate Name</span>
            <p className="text-sm font-bold text-foreground">{student.name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{student.registrationNumber}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Academic Program</span>
            <p className="font-semibold text-foreground">{student.programName}</p>
            <p className="text-[11px] text-muted-foreground">
              {student.departmentName} &bull; Year {student.yearOfStudy} (Sem {student.semester})
            </p>
          </div>

          <div className="space-y-1 md:text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Clearance Serial</span>
            <p className="font-mono font-bold text-primary">{cardSerial}</p>
            <p className="text-[10px] text-muted-foreground">Issued: {new Date(issuedAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* ── Approved Examination Courses Table ── */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Approved Course Units & Invigilator Sign-Off
          </h4>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="pl-4 w-28 text-xs font-bold">Course Code</TableHead>
                  <TableHead className="text-xs font-bold">Course Title</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold">CU</TableHead>
                  <TableHead className="w-28 text-center text-xs font-bold">Attendance</TableHead>
                  <TableHead className="w-36 text-center text-xs font-bold">Candidate Sig.</TableHead>
                  <TableHead className="w-36 text-center pr-4 text-xs font-bold">Invigilator Sig.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground text-xs">
                      No courses registered.
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course: any) => (
                    <TableRow key={course.courseId} className="hover:bg-muted/10">
                      <TableCell className="pl-4 font-mono font-bold text-xs">{course.code}</TableCell>
                      <TableCell className="font-medium text-xs text-foreground">{course.title}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{course.creditUnits}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                          {course.attendanceRate}% Cleared
                        </Badge>
                      </TableCell>
                      <TableCell className="border-l border-r"></TableCell>
                      <TableCell className="pr-4"></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Institutional Authorization Signatures & Stamps ── */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t">
          {/* Finance Stamp */}
          <div className="border-2 border-dashed border-emerald-300 bg-emerald-500/5 p-4 rounded-lg text-center space-y-1">
            <CheckCircle2 className="size-6 text-emerald-600 mx-auto" />
            <span className="text-xs font-bold text-emerald-800 uppercase block tracking-wider">
              FINANCE CLEARED
            </span>
            <p className="text-[10px] text-muted-foreground">
              Tuition balance cleared / approved for exams.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground pt-1">Bursar / Accounts Office</p>
          </div>

          {/* Academic Registrar Stamp */}
          <div className="border-2 border-dashed border-primary/40 bg-primary/5 p-4 rounded-lg text-center space-y-1">
            <ShieldCheck className="size-6 text-primary mx-auto" />
            <span className="text-xs font-bold text-primary uppercase block tracking-wider">
              ACADEMICALLY CLEARED
            </span>
            <p className="text-[10px] text-muted-foreground">
              Registration & 75% attendance criteria met.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground pt-1">Academic Registrar Signature</p>
          </div>
        </div>

        {/* ── Instructions to Candidates ── */}
        <div className="text-[10px] text-muted-foreground border-t pt-3 space-y-1">
          <p className="font-semibold text-foreground">IMPORTANT REGULATIONS FOR CANDIDATES:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>This Examination Clearance Card together with a valid ECU Student Identity Card must be produced at every examination sitting.</li>
            <li>Strictly NO mobile phones, smartwatches, or unauthorized printed materials are permitted in the examination hall.</li>
            <li>Candidates must sign the attendance register and have this card signed by the chief invigilator upon submission of exam scripts.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

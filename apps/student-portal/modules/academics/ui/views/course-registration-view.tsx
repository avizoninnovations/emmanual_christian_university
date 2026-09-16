"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  CheckSquare,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Printer,
  ShieldCheck,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

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
import { Checkbox } from "@workspace/ui/components/checkbox";

export function CourseRegistrationView() {
  const data = useQuery(api.student_portal.getAvailableCoursesForRegistration);
  const profile = useQuery(api.student_portal.getMyProfile);
  const registerMutation = useMutation(api.student_portal.registerSemesterCourses);

  const [selectedCourseIds, setSelectedCourseIds] = useState<Id<"courses">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data?.registeredIds && data.registeredIds.length > 0) {
      setSelectedCourseIds(data.registeredIds as Id<"courses">[]);
    } else if (data?.courses) {
      // Pre-select all curriculum courses for this semester by default
      setSelectedCourseIds(data.courses.map((c: any) => c._id as Id<"courses">));
    }
  }, [data]);

  if (!data || !profile) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading course registration curriculum...</p>
      </div>
    );
  }

  const { courses, activePeriod } = data;

  const toggleCourse = (id: Id<"courses">) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const totalCU = courses
    .filter((c: any) => selectedCourseIds.includes(c._id as Id<"courses">))
    .reduce((acc: number, c: any) => acc + (c.creditUnits || 0), 0);

  const isWithinLimits = totalCU >= 12 && totalCU <= 24;
  const isRecommendedLoad = totalCU >= 15 && totalCU <= 21;

  const handleSubmit = async () => {
    if (!activePeriod) {
      toast.error("No active academic period available for registration.");
      return;
    }

    if (!isWithinLimits) {
      toast.error(
        totalCU < 12
          ? `Minimum credit load is 12 CU. Current total is ${totalCU} CU.`
          : `Maximum allowed credit load is 24 CU. Current total is ${totalCU} CU.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registerMutation({
        courseIds: selectedCourseIds,
        periodId: activePeriod._id,
      });

      toast.success(
        `Successfully registered ${res.registeredCount} courses (${res.totalCreditUnits} Credit Units)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to register courses");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Semester Course Registration</h1>
            <Badge variant="outline" className="text-xs">
              {activePeriod?.name || "Active Term"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enroll in your prescribed semester curriculum units per South Sudan MoHEST guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.registeredIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
              <Printer className="size-3.5" /> Print Registration Slip
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCourseIds.length === 0}
            className="gap-1.5 bg-primary text-primary-foreground print:hidden"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Confirm Registration
          </Button>
        </div>
      </div>

      {/* ── Student & Academic Rules Banner ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Student Info Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Full Name:</span>
              <span className="font-semibold">{profile.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Reg Number:</span>
              <span className="font-mono font-bold">{profile.registrationNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Program:</span>
              <span className="font-medium text-right line-clamp-1">{profile.program.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Class Level:</span>
              <span>Year {profile.yearOfStudy}, Sem {profile.semester}</span>
            </div>
          </CardContent>
        </Card>

        {/* Credit Load Gauge Card */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Semester Credit Load Status</CardTitle>
              <Badge
                variant="outline"
                className={
                  isRecommendedLoad
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    : isWithinLimits
                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                    : "bg-rose-500/10 text-rose-600 border-rose-200"
                }
              >
                {totalCU} Credit Units Selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-muted/40 p-2.5 rounded-lg">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Minimum Load
                </span>
                <span className="font-semibold text-foreground">12 CU</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Standard Load
                </span>
                <span className="font-semibold text-emerald-600">15 – 21 CU</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Maximum Limit
                </span>
                <span className="font-semibold text-foreground">24 CU</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <p>
                Per South Sudan Higher Education curriculum regulations, students must complete between 15 and 21 credit units per semester for normal degree progression.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Curriculum Courses Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Prescribed Curriculum Units (Year {profile.yearOfStudy}, Semester {activePeriod?.term || 1})
          </CardTitle>
          <CardDescription className="text-xs">
            Select the course units you will be attending this semester.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 pl-6">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead className="w-32">Course Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead className="w-24 text-center">Credit Units</TableHead>
                <TableHead className="w-32">Year & Sem</TableHead>
                <TableHead className="text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    No curriculum courses configured for your program and level. Contact Academic Registrar.
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course: any) => {
                  const isChecked = selectedCourseIds.includes(course._id as Id<"courses">);
                  return (
                    <TableRow
                      key={course._id}
                      onClick={() => toggleCourse(course._id as Id<"courses">)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleCourse(course._id as Id<"courses">)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-bold text-sm">
                        {course.code}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm text-foreground">{course.title}</p>
                        {course.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {course.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <Badge variant="outline" className="bg-background text-xs">
                          {course.creditUnits} CU
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Year {course.yearOfStudy} &bull; Sem {course.semester}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {course.isRegistered ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                            <CheckCircle2 className="size-3 mr-1" /> Registered
                          </Badge>
                        ) : isChecked ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">
                            Selected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Unselected
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

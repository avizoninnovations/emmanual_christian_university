import { ConvexError } from "convex/values";
import { query } from "./_generated/server.js";
import { v } from "convex/values";
import { assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";
import { publishedAssessment } from "./lib/academicResults.js";
import { entered } from "./lib/academicAccess.js";

type LecturerCourseCard = {
  allocationId: Id<"courseAllocations">;
  courseId: Id<"courses">;
  code: string;
  title: string;
  creditUnits: number;
  yearOfStudy: number;
  semester: number;
  departmentName: string;
  programName: string;
  studentCount: number;
  studentCountCapped: boolean;
  marksEnteredCount: number;
  readyToSubmitCount: number;
  awaitingReviewCount: number;
  returnedCount: number;
  publishedCount: number;
  withdrawnCount: number;
  entriesCloseAt?: number;
  workflowStatus: "not-started" | "draft" | "returned" | "under-review" | "published" | "withdrawn" | "no-students";
};

// ─────────────────────────────────────────────────────────
// 1. LECTURER TEACHING ALLOCATIONS
// ─────────────────────────────────────────────────────────

export const getLecturerCourses = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    // Query allocations for this lecturer
    const filtered = await ctx.db.query("courseAllocations")
      .withIndex("by_lecturerId_and_periodId", q => q.eq("lecturerId", userId).eq("periodId", periodId))
      .take(500);

    // Enrich with Course details and enrolled student count
    const enriched = await Promise.all(
      filtered.map(async (a) => {
        const course = await ctx.db.get(a.courseId);
        const department = course?.departmentId ? await ctx.db.get(course.departmentId) : null;
        const program = course?.programId ? await ctx.db.get(course.programId) : null;

        // Count enrolled students in this course
        const studentRegistrations = await ctx.db
          .query("studentCourseRegistrations")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", a.courseId).eq("periodId", a.periodId)
          )
          .take(1000);

        // Check overall gradebook submission status
        const assessments = await ctx.db
          .query("studentAssessments")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", a.courseId).eq("periodId", a.periodId)
          )
          .take(1000);

        const status =
          assessments.length === 0
            ? "draft"
            : assessments.every((s) => publishedAssessment(s) !== null && s.status === "approved")
            ? "approved"
            : assessments.some((s) => s.status === "submitted")
            ? "submitted"
            : assessments.some((s) => s.status === "returned")
            ? "returned"
            : "draft";

        return {
          allocationId: a._id,
          courseId: a.courseId,
          periodId: a.periodId,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          yearOfStudy: course?.yearOfStudy ?? 1,
          semester: course?.semester ?? 1,
          departmentName: department?.name ?? "—",
          programName: program?.name ?? "—",
          enrolledCount: studentRegistrations.length,
          gradebookStatus: status,
        };
      })
    );

    return enriched;
  },
});

export const getLecturerCoursePeriods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const allocations = await ctx.db
      .query("courseAllocations")
      .withIndex("by_lecturer", (q) => q.eq("lecturerId", userId))
      .order("desc")
      .take(1000);

    const periodIds = [...new Set(allocations.map((allocation) => allocation.periodId))];
    const periods = await Promise.all(periodIds.map((periodId) => ctx.db.get(periodId)));
    const periodMap = new Map(periods.filter((period) => period !== null).map((period) => [period._id, period]));
    const courseIds = [...new Set(allocations.map((allocation) => allocation.courseId))];
    const courses = await Promise.all(courseIds.map((courseId) => ctx.db.get(courseId)));
    const courseMap = new Map(courses.filter((course) => course !== null).map((course) => [course._id, course]));
    const departmentIds = [...new Set(courses.flatMap((course) => course ? [course.departmentId] : []))];
    const departments = await Promise.all(departmentIds.map((departmentId) => ctx.db.get(departmentId)));
    const departmentMap = new Map(departments.filter((department) => department !== null).map((department) => [department._id, department.name]));
    const programIds = [...new Set(courses.flatMap((course) => course ? [course.programId] : []))];
    const programs = await Promise.all(programIds.map((programId) => ctx.db.get(programId)));
    const programMap = new Map(programs.filter((program) => program !== null).map((program) => [program._id, program.name]));
    const courseWorkflows = await Promise.all(allocations.map(async (allocation) => {
      const [registrations, assessments, gradebook] = await Promise.all([
        ctx.db.query("studentCourseRegistrations")
          .withIndex("by_course_period", q => q.eq("courseId", allocation.courseId).eq("periodId", allocation.periodId))
          .take(1001),
        ctx.db.query("studentAssessments")
          .withIndex("by_course_period", q => q.eq("courseId", allocation.courseId).eq("periodId", allocation.periodId))
          .take(1001),
        ctx.db.query("academicGradebooks")
          .withIndex("by_courseId_and_periodId", q => q.eq("courseId", allocation.courseId).eq("periodId", allocation.periodId))
          .unique(),
      ]);
      const studentIds = new Set(registrations
        .filter((registration) => registration.status === "registered" || registration.status === "completed")
        .map((registration) => registration.studentId));
      const marksByStudent = new Map(assessments.map(mark => [mark.studentId, mark]));
      let marksEnteredCount = 0;
      let readyToSubmitCount = 0;
      let awaitingReviewCount = 0;
      let returnedCount = 0;
      let publishedCount = 0;
      let withdrawnCount = 0;
      for (const studentId of studentIds) {
        const mark = marksByStudent.get(studentId);
        const hasAnyMark = entered(mark ?? null, "coursework") || entered(mark ?? null, "exam");
        const complete = entered(mark ?? null, "coursework") && entered(mark ?? null, "exam");
        if (hasAnyMark) marksEnteredCount++;
        if (complete && (mark?.status === "draft" || mark?.status === "returned")) readyToSubmitCount++;
        if (mark?.status === "submitted") awaitingReviewCount++;
        if (mark?.status === "returned") returnedCount++;
        if (mark?.status === "approved" && !mark.publicationWithdrawn) publishedCount++;
        if (mark?.status === "approved" && mark.publicationWithdrawn) withdrawnCount++;
      }
      const studentCountCapped = registrations.length > 1000 || assessments.length > 1000;
      const studentCount = studentCountCapped ? Math.max(1000, studentIds.size) : studentIds.size;
      const workflowStatus: LecturerCourseCard["workflowStatus"] = studentCount === 0 ? "no-students"
        : returnedCount > 0 ? "returned"
        : awaitingReviewCount > 0 ? "under-review"
        : publishedCount === studentCount ? "published"
        : withdrawnCount > 0 && publishedCount + withdrawnCount === studentCount ? "withdrawn"
        : marksEnteredCount > 0 ? "draft" : "not-started";
      return { allocationId: String(allocation._id), studentCount, studentCountCapped,
        marksEnteredCount, readyToSubmitCount, awaitingReviewCount, returnedCount, publishedCount,
        withdrawnCount, entriesCloseAt: gradebook?.entriesCloseAt, workflowStatus };
    }));
    const workflowByAllocation = new Map(courseWorkflows.map(({ allocationId, ...summary }) => [allocationId, summary] as const));
    const grouped = new Map<string, { period: NonNullable<(typeof periods)[number]>; courses: LecturerCourseCard[] }>();

    for (const allocation of allocations) {
      const period = periodMap.get(allocation.periodId);
      const course = courseMap.get(allocation.courseId);
      if (!period || !course) continue;
      const workflow = workflowByAllocation.get(String(allocation._id));
      if (!workflow) continue;
      const key = String(period._id);
      const periodCourses = grouped.get(key)?.courses ?? [];
      periodCourses.push({
        allocationId: allocation._id,
        courseId: course._id,
        code: course.code,
        title: course.title,
        creditUnits: course.creditUnits,
        yearOfStudy: course.yearOfStudy,
        semester: course.semester,
        departmentName: departmentMap.get(course.departmentId) ?? "—",
        programName: programMap.get(course.programId) ?? "—",
        ...workflow,
      });
      grouped.set(key, { period, courses: periodCourses });
    }

    return [...grouped.values()].sort((left, right) =>
      right.period.year - left.period.year || right.period.term - left.period.term
    );
  },
});

// ─────────────────────────────────────────────────────────
// 2. HOD COURSE ALLOCATION MATRIX
// ─────────────────────────────────────────────────────────

export { courses as getDepartmentAllocations } from "./hod.js";
export { allocateLecturerToCourse, deallocateLecturer, getDepartmentLecturers } from "./departmentAllocations.js";

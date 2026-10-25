import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel.js";
import type { QueryCtx, MutationCtx } from "../_generated/server.js";
import { staffName } from "./academicAccess.js";

type ReadCtx = QueryCtx | MutationCtx;

export function requestIsActive(status: Doc<"studentCourseUnitAggregations">["status"]) {
  return status === "pending_lecturer" || status === "pending_hod" || status === "approved";
}

export async function getCurrentStudent(ctx: ReadCtx, userId: string) {
  const student = await ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", userId)).unique();
  if (!student || student.status !== "active") throw new ConvexError("An active student profile is required.");
  return student;
}

export async function requireActivePeriod(ctx: ReadCtx) {
  const period = await ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "active")).first();
  if (!period) throw new ConvexError("There is no active Academic Period for course aggregation requests.");
  return period;
}

export async function enrichAggregationRequests(ctx: ReadCtx, requests: Doc<"studentCourseUnitAggregations">[]) {
  const studentIds = [...new Set(requests.map(request => request.studentId))];
  const courseIds = [...new Set(requests.map(request => request.courseId))];
  const periodIds = [...new Set(requests.map(request => request.periodId))];
  const departmentIds = [...new Set(requests.map(request => request.departmentId))];
  const lecturerIds = [...new Set(requests.map(request => request.lecturerId))];
  const [students, courses, periods, departments, lecturers] = await Promise.all([
    Promise.all(studentIds.map(async id => [id, await ctx.db.get(id)] as const)),
    Promise.all(courseIds.map(async id => [id, await ctx.db.get(id)] as const)),
    Promise.all(periodIds.map(async id => [id, await ctx.db.get(id)] as const)),
    Promise.all(departmentIds.map(async id => [id, await ctx.db.get(id)] as const)),
    Promise.all(lecturerIds.map(async id => [id, await staffName(ctx, id)] as const)),
  ]);
  const studentMap = new Map(students);
  const courseMap = new Map(courses);
  const periodMap = new Map(periods);
  const departmentMap = new Map(departments);
  const lecturerMap = new Map(lecturers);
  const programIds = [...new Set(students.flatMap(([, student]) => student ? [student.programId] : []))];
  const programs = await Promise.all(programIds.map(async id => [id, await ctx.db.get(id)] as const));
  const programMap = new Map(programs);
  return requests.map(request => {
    const student = studentMap.get(request.studentId);
    const course = courseMap.get(request.courseId);
    const period = periodMap.get(request.periodId);
    return {
      ...request,
      studentName: student ? [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ") : "Student record unavailable",
      registrationNumber: student?.registrationNumber ?? "—",
      accessNumber: student?.accessNumber ?? "—",
      programName: student ? programMap.get(student.programId)?.name ?? "Program unavailable" : "—",
      courseProgramName: course ? programMap.get(course.programId)?.name ?? "Program unavailable" : "—",
      isCrossProgram: !!student && !!course && course.programId !== student.programId,
      studentYear: student?.yearOfStudy ?? 0,
      courseCode: course?.code ?? "—",
      courseTitle: course?.title ?? "Course record unavailable",
      creditUnits: course?.creditUnits ?? 0,
      courseYear: course?.yearOfStudy,
      courseSemester: course?.semester,
      periodName: period ? `${period.name} ${period.year}` : "Academic Period unavailable",
      departmentName: departmentMap.get(request.departmentId)?.name ?? "—",
      lecturerName: lecturerMap.get(request.lecturerId)?.name ?? "Staff member",
    };
  });
}

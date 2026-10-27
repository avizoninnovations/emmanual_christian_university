import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import { calculateGrade } from "./academicResults.js";

type DemoReferences = {
  courseIds: Record<string, Id<"courses">>;
  departmentIds: Record<string, Id<"departments">>;
  periodIds: Record<string, Id<"academicPeriods">>;
  staffIds: Record<string, string>;
};

const HOD_EMAIL = "hod.demo@ecu-ssd.org";
const REVIEWER_EMAIL = "lecturer.theology.demo@ecu-ssd.org";
const LECTURER_EMAIL = "lecturer.agriculture.demo@ecu-ssd.org";
const MARKS_COURSE = "D-AGR-0104";
const UPCOMING_COURSES = ["D-AGR-0101", "D-AGR-0102"];

/** Adds linked demo records for HOD allocation, review, mark entry, and time-bound permissions. */
export async function seedDemoAcademicWorkflow(ctx: MutationCtx, refs: DemoReferences) {
  const now = Date.now();
  const departmentId = refs.departmentIds["dept-agriculture"];
  const hodId = refs.staffIds[HOD_EMAIL];
  const reviewerId = refs.staffIds[REVIEWER_EMAIL];
  const lecturerId = refs.staffIds[LECTURER_EMAIL];
  const currentPeriodId = refs.periodIds["2026-term-2"];
  const courseId = refs.courseIds[MARKS_COURSE];

  if (!departmentId || !hodId || !reviewerId || !lecturerId || !currentPeriodId || !courseId) return 0;

  let inserted = 0;
  const department = await ctx.db.get(departmentId);
  const hod = await ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", hodId)).unique();
  if (department && hod && (!department.hodId || department.hodId === hodId)) {
    const activeLeadership = await ctx.db.query("departmentLeadershipAssignments")
      .withIndex("by_departmentId_and_status", q => q.eq("departmentId", departmentId).eq("status", "active")).unique();
    if (!activeLeadership) {
      await ctx.db.insert("departmentLeadershipAssignments", {
        departmentId, staffUserId: hodId, appointedBy: refs.staffIds["admin.demo@ecu-ssd.org"] ?? "system",
        startsAt: now, reason: "Department leadership test assignment", status: "active",
        createdAt: now, updatedAt: now,
      });
      inserted++;
    }
    if (!department.hodId) {
      await ctx.db.patch(departmentId, { hodId, updatedAt: now });
      inserted++;
    }
    if (!hod.roles.includes("hod")) {
      await ctx.db.patch(hod._id, { roles: [...new Set([...hod.roles, "hod", "staff"])], updatedAt: now });
      inserted++;
    }
  }
  const independentReviewer = await ctx.db.query("staffProfiles")
    .withIndex("by_userId", q => q.eq("userId", reviewerId)).unique();
  if (independentReviewer && !independentReviewer.roles.includes("hod")) {
    await ctx.db.patch(independentReviewer._id, {
      roles: [...new Set([...independentReviewer.roles, "hod", "staff"])], updatedAt: now,
    });
    inserted++;
  }

  const nextSemester = await ctx.db.query("academicPeriods")
    .withIndex("by_term_year", q => q.eq("term", 1).eq("year", 2027)).first();
  const nextPeriodId = nextSemester?._id ?? await ctx.db.insert("academicPeriods", {
    name: "Semester 1", term: 1, year: 2027, startDate: "2027-02-01", endDate: "2027-06-15",
    status: "upcoming", createdAt: now, updatedAt: now,
  });
  if (!nextSemester) inserted++;

  for (const code of UPCOMING_COURSES) {
    const upcomingCourseId = refs.courseIds[code];
    if (!upcomingCourseId) continue;
    const allocation = await ctx.db.query("courseAllocations")
      .withIndex("by_course_period", q => q.eq("courseId", upcomingCourseId).eq("periodId", nextPeriodId)).unique();
    if (!allocation) {
      await ctx.db.insert("courseAllocations", {
        courseId: upcomingCourseId, periodId: nextPeriodId, lecturerId, departmentId,
        assignedBy: hodId, revision: 1, createdAt: now, updatedAt: now,
      });
      inserted++;
    }
  }

  const currentAllocation = await ctx.db.query("courseAllocations")
    .withIndex("by_course_period", q => q.eq("courseId", courseId).eq("periodId", currentPeriodId)).unique();
  const book = await ctx.db.query("academicGradebooks")
    .withIndex("by_courseId_and_periodId", q => q.eq("courseId", courseId).eq("periodId", currentPeriodId)).unique();
  if (!book) {
    await ctx.db.insert("academicGradebooks", {
      courseId, periodId: currentPeriodId, departmentId, reviewerId, createdAt: now, updatedAt: now,
    });
    inserted++;
  } else if (!book.reviewerId || book.reviewerId === hodId) {
    await ctx.db.patch(book._id, { reviewerId, updatedAt: now });
    inserted++;
  }

  const registrations = await ctx.db.query("studentCourseRegistrations")
    .withIndex("by_course_period", q => q.eq("courseId", courseId).eq("periodId", currentPeriodId)).take(100);
  const roster = registrations.filter(row => row.status === "registered" || row.status === "completed");
  const cases = [
    { index: 2, coursework: 24, exam: 48, status: "submitted" as const },
    { index: 3, coursework: 18, exam: null, status: "draft" as const },
    { index: 4, coursework: 20, exam: 32, status: "returned" as const },
  ];
  for (const sample of cases) {
    const registration = roster[sample.index];
    if (!registration) continue;
    const existing = await ctx.db.query("studentAssessments").withIndex("by_student_course_period", q =>
      q.eq("studentId", registration.studentId).eq("courseId", courseId).eq("periodId", currentPeriodId)).unique();
    if (existing) continue;
    const exam = sample.exam ?? 0;
    const finalScore = sample.coursework + exam;
    const grade = calculateGrade(finalScore);
    await ctx.db.insert("studentAssessments", {
      studentId: registration.studentId, courseId, periodId: currentPeriodId, lecturerId,
      departmentId, courseworkMarks: sample.coursework, examMarks: exam, finalScore,
      ...grade, courseworkEntered: true, examEntered: sample.exam !== null,
      status: sample.status, revision: 1,
      submittedBy: sample.status === "submitted" ? lecturerId : undefined,
      submittedAt: sample.status === "submitted" ? now : undefined,
      returnReason: sample.status === "returned" ? "Please verify the examination score before resubmitting." : undefined,
      createdAt: now, updatedAt: now,
    });
    inserted++;
  }

  const permissionStudent = roster[6]?.studentId;
  if (currentAllocation && permissionStudent) {
    const permissions = await ctx.db.query("markEditPermissions")
      .withIndex("by_studentId_and_courseId_and_periodId", q => q.eq("studentId", permissionStudent).eq("courseId", courseId).eq("periodId", currentPeriodId)).take(10);
    if (!permissions.some(permission => ["requested", "granted"].includes(permission.status) && permission.expiresAt > now)) {
      await ctx.db.insert("markEditPermissions", {
        courseId, periodId: currentPeriodId, studentId: permissionStudent, departmentId,
        lecturerId, allocationId: currentAllocation._id, allocationRevision: currentAllocation.revision ?? 0,
        components: ["exam"], reason: "Request to enter a missing examination mark.",
        status: "requested", requestedBy: lecturerId, startsAt: now - 60_000,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, createdAt: now, updatedAt: now,
      });
      inserted++;
    }
  }

  return inserted;
}

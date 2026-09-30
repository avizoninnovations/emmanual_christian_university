import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

// Helper to fetch user map
async function getUsersMap(ctx: any): Promise<Map<string, { name: string; email: string }>> {
  try {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: null, numItems: 2000 },
    });
    const users = result?.page || [];
    return new Map(users.map((u: any) => [u._id, { name: u.name, email: u.email }]));
  } catch {
    return new Map();
  }
}

/**
 * South Sudan University Grading Standard Calculator
 */
export function calculateGrade(score: number): { grade: string; gradePoints: number } {
  if (score >= 80) return { grade: "A", gradePoints: 4.0 };
  if (score >= 70) return { grade: "B+", gradePoints: 3.5 };
  if (score >= 60) return { grade: "B", gradePoints: 3.0 };
  if (score >= 55) return { grade: "C+", gradePoints: 2.5 };
  if (score >= 50) return { grade: "C", gradePoints: 2.0 };
  if (score >= 40) return { grade: "D", gradePoints: 1.0 };
  return { grade: "F", gradePoints: 0.0 };
}

// ─────────────────────────────────────────────────────────
// 1. GRADEBOOK QUERIES
// ─────────────────────────────────────────────────────────

export const getCourseGradebook = query({
  args: {
    courseId: v.id("courses"),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return null;

    const period = await ctx.db.get(periodId);
    if (!period) return null;

    // 1. Fetch enrolled students via registrations, or active program students
    let enrolledStudents = await ctx.db
      .query("studentCourseRegistrations")
      .withIndex("by_course_period", (q) =>
        q.eq("courseId", args.courseId).eq("periodId", periodId!)
      )
      .collect();

    // Fallback: If no explicit course registrations exist yet, fetch active students in the target program
    let studentIds: Id<"students">[] = [];
    if (enrolledStudents.length > 0) {
      studentIds = enrolledStudents.map((r) => r.studentId);
    } else {
      const programStudents = await ctx.db
        .query("students")
        .withIndex("by_program", (q) => q.eq("programId", course.programId))
        .collect();
      studentIds = programStudents
        .filter((s) => s.status === "active")
        .map((s) => s._id);
    }

    // 2. Fetch existing assessments for this course and period
    const existingAssessments = await ctx.db
      .query("studentAssessments")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", periodId!)
      )
      .collect();

    const assessmentMap = new Map(
      existingAssessments.map((a) => [a.studentId, a])
    );

    const usersMap = await getUsersMap(ctx);

    // 3. Build student grade rows
    const studentRows = await Promise.all(
      studentIds.map(async (sid) => {
        const student = await ctx.db.get(sid);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const mark = assessmentMap.get(sid);

        const coursework = mark?.courseworkMarks ?? 0;
        const exam = mark?.examMarks ?? 0;
        const assignment = mark?.assignmentMarks;
        const test = mark?.testMarks;
        const finalScore = mark ? mark.finalScore : Math.round(coursework + exam);
        const derived = calculateGrade(finalScore);

        return {
          studentId: sid,
          studentName: user?.name ?? "Student",
          studentRegNumber: student?.registrationNumber ?? "—",
          assignmentMarks: assignment,
          testMarks: test,
          courseworkMarks: coursework,
          examMarks: exam,
          finalScore,
          grade: mark?.grade ?? derived.grade,
          gradePoints: mark?.gradePoints ?? derived.gradePoints,
          status: mark?.status ?? "draft",
          returnReason: mark?.returnReason,
          isUnlocked: mark?.isUnlocked ?? false,
          isSupplementary: mark?.isSupplementary ?? false,
          supplementaryScore: mark?.supplementaryScore,
          originalScore: mark?.originalScore,
          originalGrade: mark?.originalGrade,
          assessmentId: mark?._id,
        };
      })
    );

    // Determine overall course status
    let overallStatus: "draft" | "submitted" | "approved" | "returned" = "draft";
    let returnReason: string | undefined = undefined;

    if (existingAssessments.length > 0) {
      if (existingAssessments.every((a) => a.status === "approved")) {
        overallStatus = "approved";
      } else if (existingAssessments.some((a) => a.status === "returned")) {
        overallStatus = "returned";
        returnReason = existingAssessments.find((a) => a.returnReason)?.returnReason;
      } else if (existingAssessments.some((a) => a.status === "submitted")) {
        overallStatus = "submitted";
      }
    }

    return {
      course: {
        _id: course._id,
        code: course.code,
        title: course.title,
        creditUnits: course.creditUnits,
        yearOfStudy: course.yearOfStudy,
        semester: course.semester,
      },
      period: {
        _id: period._id,
        name: period.name,
        year: period.year,
      },
      overallStatus,
      returnReason,
      students: studentRows,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 2. MARKS ENTRY & SUBMISSION MUTATIONS
// ─────────────────────────────────────────────────────────

export const saveGradebookDraft = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    marks: v.array(
      v.object({
        studentId: v.id("students"),
        assignmentMarks: v.optional(v.number()), // 0 - 10
        testMarks: v.optional(v.number()),       // 0 - 20
        courseworkMarks: v.number(),             // 0 - 30
        examMarks: v.number(),                   // 0 - 70
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    for (const item of args.marks) {
      const assignment =
        item.assignmentMarks !== undefined
          ? Math.min(10, Math.max(0, item.assignmentMarks))
          : undefined;
      const test =
        item.testMarks !== undefined
          ? Math.min(20, Math.max(0, item.testMarks))
          : undefined;

      // If assignment and test provided, compute coursework as their sum (capped at 30)
      const coursework =
        assignment !== undefined || test !== undefined
          ? Math.min(30, Math.max(0, (assignment ?? 0) + (test ?? 0)))
          : Math.min(30, Math.max(0, item.courseworkMarks));

      const exam = Math.min(70, Math.max(0, item.examMarks));
      const finalScore = Math.min(100, Math.round(coursework + exam));
      const { grade, gradePoints } = calculateGrade(finalScore);

      const existing = await ctx.db
        .query("studentAssessments")
        .withIndex("by_student_course_period", (q: any) =>
          q
            .eq("studentId", item.studentId)
            .eq("courseId", args.courseId)
            .eq("periodId", args.periodId)
        )
        .first();

      if (existing) {
        // If already approved, only allow edit if isUnlocked is true
        if (existing.status === "approved" && !existing.isUnlocked) {
          continue; // skip locked approved mark
        }

        await ctx.db.patch(existing._id, {
          assignmentMarks: assignment,
          testMarks: test,
          courseworkMarks: coursework,
          examMarks: exam,
          finalScore,
          grade,
          gradePoints,
          status: "draft",
          isUnlocked: false, // consume unlock grant
        });
      } else {
        await ctx.db.insert("studentAssessments", {
          studentId: item.studentId,
          courseId: args.courseId,
          periodId: args.periodId,
          lecturerId: userId,
          assignmentMarks: assignment,
          testMarks: test,
          courseworkMarks: coursework,
          examMarks: exam,
          finalScore,
          grade,
          gradePoints,
          status: "draft",
        });
      }
    }

    return { success: true };
  },
});

export const submitGradebookToHOD = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    const assessments = await ctx.db
      .query("studentAssessments")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", args.periodId)
      )
      .collect();

    if (assessments.length === 0) {
      throw new Error("Cannot submit an empty gradebook. Please enter student marks first.");
    }

    for (const a of assessments) {
      await ctx.db.patch(a._id, {
        status: "submitted",
        returnReason: undefined,
      });
    }

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "SUBMIT_GRADEBOOK",
      resource: "studentAssessments",
      details: `Submitted gradebook for ${course?.code} (${assessments.length} students) to HOD for approval`,
    });

    return { success: true, count: assessments.length };
  },
});

// ─────────────────────────────────────────────────────────
// 3. HOD REVIEW QUEUE & APPROVAL
// ─────────────────────────────────────────────────────────

export const getHODReviewQueue = query({
  args: {
    departmentId: v.optional(v.id("departments")),
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "dean"]);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    // Find all submitted assessments for this period
    let submitted = await ctx.db
      .query("studentAssessments")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    submitted = submitted.filter((s) => s.periodId === periodId);

    // Group by courseId
    const courseIds = Array.from(new Set(submitted.map((s) => s.courseId)));
    const usersMap = await getUsersMap(ctx);

    const queue = await Promise.all(
      courseIds.map(async (cid) => {
        const course = await ctx.db.get(cid);
        const department = course ? await ctx.db.get(course.departmentId) : null;
        const program = course ? await ctx.db.get(course.programId) : null;

        const allocation = await ctx.db
          .query("courseAllocations")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", cid).eq("periodId", periodId!)
          )
          .first();

        const lecturerUser = allocation ? usersMap.get(allocation.lecturerId) : null;
        const courseMarks = submitted.filter((s) => s.courseId === cid);

        const status = courseMarks.every((m) => m.status === "approved")
          ? "approved"
          : courseMarks.some((m) => m.status === "returned")
          ? "returned"
          : courseMarks.some((m) => m.status === "submitted")
          ? "submitted"
          : "draft";

        return {
          courseId: cid,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          yearOfStudy: course?.yearOfStudy ?? 1,
          semester: course?.semester ?? 1,
          departmentId: course?.departmentId,
          departmentName: department?.name ?? "—",
          programName: program?.name ?? "—",
          lecturerName: lecturerUser?.name ?? "Lecturer",
          lecturerEmail: lecturerUser?.email ?? "—",
          studentCount: courseMarks.length,
          status,
          lastUpdated: courseMarks[0]?.updatedAt ?? Date.now(),
        };
      })
    );

    if (args.departmentId) {
      return queue.filter((q) => q.departmentId === args.departmentId);
    }

    return queue;
  },
});

export const approveCourseMarks = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "dean"]);

    const assessments = await ctx.db
      .query("studentAssessments")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", args.periodId)
      )
      .collect();

    for (const a of assessments) {
      await ctx.db.patch(a._id, {
        status: "approved",
        isUnlocked: false,
      });
    }

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "APPROVE_GRADEBOOK",
      resource: "studentAssessments",
      details: `HOD Approved marks for ${course?.code} (${assessments.length} students finalized)`,
    });

    return { success: true };
  },
});

export const returnCourseMarks = mutation({
  args: {
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "dean"]);

    if (!args.reason.trim()) {
      throw new Error("Please provide a reason for returning the marks.");
    }

    const assessments = await ctx.db
      .query("studentAssessments")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", args.periodId)
      )
      .collect();

    for (const a of assessments) {
      await ctx.db.patch(a._id, {
        status: "returned",
        returnReason: args.reason.trim(),
      });
    }

    const course = await ctx.db.get(args.courseId);
    await logAction(ctx, {
      action: "RETURN_GRADEBOOK",
      resource: "studentAssessments",
      details: `Returned marks for ${course?.code} to lecturer. Reason: ${args.reason}`,
    });

    return { success: true };
  },
});

export const grantSingleStudentUnlock = mutation({
  args: {
    assessmentId: v.id("studentAssessments"),
  },
  handler: async (ctx, args) => {
    const callerId = await assertRole(ctx, ["admin", "hod"]);

    await ctx.db.patch(args.assessmentId, {
      isUnlocked: true,
      unlockedBy: callerId,
      unlockedAt: Date.now(),
    });

    const mark = await ctx.db.get(args.assessmentId);
    await logAction(ctx, {
      action: "GRANT_MARK_UNLOCK",
      resource: "studentAssessments",
      details: `HOD unlocked mark for student ${mark?.studentId} in course ${mark?.courseId}`,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────
// 3B. SUPPLEMENTARY & SPECIAL EXAMINATION WORKFLOW
// ─────────────────────────────────────────────────────────

export const getSupplementaryCandidates = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }
    if (!periodId) return [];

    let assessments = await ctx.db
      .query("studentAssessments")
      .filter((q) => q.eq(q.field("periodId"), periodId))
      .collect();

    if (args.courseId) {
      assessments = assessments.filter((a) => a.courseId === args.courseId);
    }

    // In South Sudan, Grade D (40 - 49%) or explicit special exam qualification qualifies for supplementary
    const candidates = assessments.filter(
      (a) => a.grade === "D" || a.isSupplementary || a.isSpecialExam
    );

    const usersMap = await getUsersMap(ctx);

    const enriched = await Promise.all(
      candidates.map(async (c) => {
        const student = await ctx.db.get(c.studentId);
        const user = student?.userId ? usersMap.get(student.userId) : null;
        const course = await ctx.db.get(c.courseId);

        return {
          assessmentId: c._id,
          studentId: c.studentId,
          studentName: user?.name ?? "Student",
          studentRegNumber: student?.registrationNumber ?? "—",
          courseId: c.courseId,
          courseCode: course?.code ?? "—",
          courseTitle: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          originalScore: c.originalScore ?? c.finalScore,
          originalGrade: c.originalGrade ?? c.grade,
          supplementaryScore: c.supplementaryScore,
          currentScore: c.finalScore,
          currentGrade: c.grade,
          isSupplementary: c.isSupplementary ?? false,
          isSpecialExam: c.isSpecialExam ?? false,
          status: c.status,
        };
      })
    );

    return enriched;
  },
});

export const recordSupplementaryMark = mutation({
  args: {
    assessmentId: v.id("studentAssessments"),
    rawScore: v.number(), // 0 - 100
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "lecturer", "staff"]);

    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new Error("Assessment record not found");

    const raw = Math.min(100, Math.max(0, args.rawScore));

    // South Sudan MoHEST Regulation:
    // Capped at Grade C (50%, 2.0 GP) if student passes (raw >= 50).
    // If student fails (raw < 50), remains Grade F (raw score, 0.0 GP).
    let finalScore: number;
    let grade: string;
    let gradePoints: number;

    if (raw >= 50) {
      finalScore = 50;
      grade = "C";
      gradePoints = 2.0;
    } else {
      finalScore = raw;
      grade = "F";
      gradePoints = 0.0;
    }

    await ctx.db.patch(args.assessmentId, {
      originalScore: assessment.originalScore ?? assessment.finalScore,
      originalGrade: assessment.originalGrade ?? assessment.grade,
      supplementaryScore: raw,
      finalScore,
      grade,
      gradePoints,
      isSupplementary: true,
      status: "approved",
    });

    const course = await ctx.db.get(assessment.courseId);
    const student = await ctx.db.get(assessment.studentId);

    await logAction(ctx, {
      action: "RECORD_SUPPLEMENTARY_MARK",
      resource: "studentAssessments",
      details: `Supplementary exam recorded for ${student?.registrationNumber} in ${course?.code}. Raw: ${raw}%, Capped: ${finalScore}% (${grade})`,
    });

    return {
      success: true,
      finalScore,
      grade,
      gradePoints,
    };
  },
});

// ─────────────────────────────────────────────────────────
// 4. GRADING SCALES (PRESERVED)
// ─────────────────────────────────────────────────────────

export const getGradingScales = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.db.query("gradingScales").order("desc").collect();
  },
});

export const createGradingScale = mutation({
  args: {
    grade: v.string(),
    minScore: v.number(),
    maxScore: v.number(),
    gpaValue: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "staff"]);
    const id = await ctx.db.insert("gradingScales", args);

    await logAction(ctx, {
      action: "CREATE_GRADING_SCALE",
      resource: "gradingScales",
      details: `Created grading scale: ${args.grade} (${args.minScore}-${args.maxScore})`,
    });

    return id;
  },
});

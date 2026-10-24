import { managedDepartments, classContext, requireEnrollment } from "./lib/academicAccess.js";
import { approvedSnapshot, publishedAssessment } from "./lib/academicResults.js";
import { permissionForStudent, permissionActive } from "./lib/markPermissionAccess.js";
import { academicEvent } from "./lib/academicAudit.js";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger.js";
import { assertRole, assertAuthenticated } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";

export { calculateGrade } from "./lib/academicResults.js";
export { getCourseGradebook } from "./gradebook.js";
export { saveGradebookDraft, submitGradebookToHOD } from "./markEntry.js";
export { approveCourseMarks, returnCourseMarks, grantSingleStudentUnlock } from "./markReview.js";
export { courses as getHODReviewQueue } from "./hod.js";

export const getSupplementaryCandidates = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
    courseId: v.optional(v.id("courses")),
    paginationOpts: paginationOptsValidator,
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
    if (!periodId) return { page: [], isDone: true, continueCursor: "" };

    const scope = await managedDepartments(ctx);
    const allowed = new Set(scope.departments.map(department => String(department._id)));
    const courseId = args.courseId;
    const page = courseId
      ? await ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", courseId).eq("periodId", periodId)).paginate(args.paginationOpts)
      : await ctx.db.query("studentAssessments").withIndex("by_periodId", q => q.eq("periodId", periodId)).paginate(args.paginationOpts);
    const scopedAssessments = await Promise.all(page.page.map(async row => {
      const course = await ctx.db.get(row.courseId);
      const published = publishedAssessment(row);
      return course && allowed.has(String(course.departmentId)) && published ? { result: published, course } : null;
    }));
    // In South Sudan, Grade D (40 - 49%) or explicit special exam qualification qualifies for supplementary
    const candidates = scopedAssessments.filter((item): item is NonNullable<typeof item> => !!item
      && (item.result.grade === "D" || !!item.result.isSupplementary || !!item.result.isSpecialExam));
    const enriched = await Promise.all(candidates.map(async ({ result: c, course }) => {
        const student = await ctx.db.get(c.studentId);
        return {
          assessmentId: c._id,
          revision: c.revision ?? 0,
          studentId: c.studentId,
          studentName: student ? [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ") || student.registrationNumber : "Student",
          studentRegNumber: student?.registrationNumber ?? "—",
          courseId: c.courseId,
          courseCode: course.code,
          courseTitle: course.title,
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
      }));

    return { ...page, page: enriched };
  },
});

export const recordSupplementaryMark = mutation({
  args: {
    assessmentId: v.id("studentAssessments"),
    rawScore: v.number(), // 0 - 100
    expectedRevision: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod", "lecturer", "staff"]);

    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new ConvexError("Assessment record not found");
    if ((assessment.revision ?? 0) !== args.expectedRevision) throw new ConvexError("This result changed. Reload before recording the supplementary mark.");

    const access = await classContext(ctx, assessment.courseId, assessment.periodId);
    if (!access.isLecturer) throw new ConvexError("Only the allocated lecturer can enter supplementary marks.");
    await requireEnrollment(ctx, assessment.studentId, assessment.courseId, assessment.periodId);
    const grant = await permissionForStudent(ctx, assessment.studentId, assessment.courseId, assessment.periodId);
    if (!permissionActive(grant, access.userId, Date.now()) || !grant?.components.includes("exam")) throw new ConvexError("A current examination editing permission is required.");
    if (!Number.isFinite(args.rawScore) || args.rawScore < 0 || args.rawScore > 100) throw new ConvexError("Enter a score between 0 and 100.");
    const raw = args.rawScore;

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
      status: "submitted",
      revision: (assessment.revision ?? 0) + 1,
      submittedBy: access.userId, submittedAt: Date.now(),
      approvedSnapshot: assessment.approvedSnapshot ?? (assessment.status === "approved" ? approvedSnapshot(assessment) : undefined),
    });

    await ctx.db.patch(grant._id, { status: "submitted", updatedAt: Date.now() });
    const course = await ctx.db.get(assessment.courseId);
    const student = await ctx.db.get(assessment.studentId);
    await academicEvent(ctx, { actorId: access.userId, departmentId: access.course.departmentId,
      courseId: assessment.courseId, periodId: assessment.periodId, studentId: assessment.studentId,
      grantId: grant._id, revision: (assessment.revision ?? 0) + 1, action: "SUBMIT_SUPPLEMENTARY_MARK",
      details: `Supplementary result submitted for HOD approval. Raw ${raw}%, capped ${finalScore}% (${grade}).` });

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
    await assertRole(ctx, ["admin"]);
    const id = await ctx.db.insert("gradingScales", args);

    await logAction(ctx, {
      action: "CREATE_GRADING_SCALE",
      resource: "gradingScales",
      details: `Created grading scale: ${args.grade} (${args.minScore}-${args.maxScore})`,
    });

    return id;
  },
});

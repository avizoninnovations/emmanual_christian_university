import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import fixture from "../seed-data/ecu-demo-seed.json";
import { calculateGrade } from "./academicResults.js";

type DemoReferences = {
  courseIds: Record<string, Id<"courses">>;
  departmentIds: Record<string, Id<"departments">>;
  periodIds: Record<string, Id<"academicPeriods">>;
  staffIds: Record<string, string>;
};

const AGRICULTURE_HOD = "hod.demo@ecu-ssd.org";
const AGRICULTURE_LECTURER = "lecturer.agriculture.demo@ecu-ssd.org";

/** Publishes varied synthetic marks for every registered Agriculture course and matching semester. */
export async function seedDemoAgricultureMarks(ctx: MutationCtx, refs: DemoReferences) {
  const agriculture = fixture.faculties.find(faculty => faculty.key === "agriculture");
  const departmentId = refs.departmentIds["dept-agriculture"];
  const lecturerId = refs.staffIds[AGRICULTURE_LECTURER];
  const approvedBy = refs.staffIds[AGRICULTURE_HOD];
  if (!agriculture || !departmentId || !lecturerId) return 0;

  const courses = agriculture.programs.flatMap(program => program.courseUnits);
  const classes = await Promise.all(courses.map(async (course, courseIndex) => {
    const courseId = refs.courseIds[course.code];
    const periodId = refs.periodIds[`2026-term-${course.semester}`];
    if (!courseId || !periodId) return { course, courseIndex, courseId: null, periodId: null, registrations: [], assessments: [] };
    const [registrations, assessments] = await Promise.all([
      ctx.db.query("studentCourseRegistrations").withIndex("by_course_period", q =>
        q.eq("courseId", courseId).eq("periodId", periodId)).take(100),
      ctx.db.query("studentAssessments").withIndex("by_course_period", q =>
        q.eq("courseId", courseId).eq("periodId", periodId)).take(100),
    ]);
    return { course, courseIndex, courseId, periodId, registrations, assessments };
  }));

  const now = Date.now();
  let inserted = 0;
  for (const group of classes) {
    if (!group.courseId || !group.periodId) continue;
    const eligible = group.registrations.filter(row => row.status === "registered" || row.status === "completed");
    for (const [studentIndex, registration] of eligible.entries()) {
      const existing = group.assessments.find(mark => mark.studentId === registration.studentId);
      if (existing) {
        if (["draft", "submitted", "returned"].includes(existing.status) && !existing.approvedSnapshot) {
          await ctx.db.patch(existing._id, {
            approvedSnapshot: {
              courseworkMarks: existing.courseworkMarks, examMarks: existing.examMarks,
              finalScore: existing.finalScore, courseworkEntered: existing.courseworkEntered !== false,
              examEntered: existing.examEntered !== false, grade: existing.grade, gradePoints: existing.gradePoints,
              revision: existing.revision ?? 0, ...(approvedBy ? { approvedBy } : {}),
              approvedAt: existing.updatedAt,
            },
          });
          inserted++;
        }
        continue;
      }
      const courseworkMarks = 8 + ((studentIndex * 7 + group.courseIndex * 3) % 23);
      const examMarks = 5 + ((studentIndex * 13 + group.courseIndex * 17) % 66);
      const finalScore = courseworkMarks + examMarks;
      const grade = calculateGrade(finalScore);
      await ctx.db.insert("studentAssessments", {
        studentId: registration.studentId, courseId: group.courseId, periodId: group.periodId,
        lecturerId, departmentId, courseworkMarks, examMarks, finalScore, ...grade,
        courseworkEntered: true, examEntered: true, submittedBy: lecturerId,
        submittedAt: now, revision: 1, status: "approved",
        approvedSnapshot: {
          courseworkMarks, examMarks, finalScore, courseworkEntered: true, examEntered: true,
          ...grade, revision: 1, ...(approvedBy ? { approvedBy } : {}), approvedAt: now,
        },
        createdAt: now, updatedAt: now,
      });
      inserted++;
    }
  }
  return inserted;
}

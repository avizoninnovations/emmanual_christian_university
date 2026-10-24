import { publishedAssessment } from "./lib/academicResults.js";
import { query } from "./_generated/server.js";
import { assertAuthenticated } from "./lib/utils.js";

export const getMyJourney = query({
  args: {},
  handler: async ctx => {
    const userId = await assertAuthenticated(ctx);
    const student = await ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", userId)).unique();
    if (!student) return null;
    const [curriculum, assessments, registrations, ledgers] = await Promise.all([
      ctx.db.query("courses").withIndex("by_program", q => q.eq("programId", student.programId)).take(200),
      ctx.db.query("studentAssessments").withIndex("by_student", q => q.eq("studentId", student._id)).take(300),
      ctx.db.query("studentSemesterRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id)).take(30),
      ctx.db.query("studentLedger").withIndex("by_student", q => q.eq("studentId", student._id)).take(30),
    ]);
    const periodIds = [...new Set(registrations.map(row => row.periodId))];
    const periods = await Promise.all(periodIds.map(id => ctx.db.get(id)));
    const periodMap = new Map(periods.flatMap(period => period ? [[period._id, period] as const] : []));
    const credits = new Map(curriculum.map(course => [course._id, course.creditUnits]));
    const approved = assessments.flatMap(mark => { const result = publishedAssessment(mark); return result ? [result] : []; });
    const passed = new Set(approved.filter(mark => mark.finalScore >= 60 && !mark.resultCode).map(mark => mark.courseId));
    const failed = new Set(approved.filter(mark => mark.finalScore < 60 || mark.resultCode).map(mark => mark.courseId));
    const timeline = registrations.flatMap(registration => {
      const period = periodMap.get(registration.periodId);
      if (!period) return [];
      const marks = approved.filter(mark => mark.periodId === period._id);
      const totalCU = marks.reduce((sum, mark) => sum + (credits.get(mark.courseId) ?? 0), 0);
      const gpa = totalCU ? marks.reduce((sum, mark) => sum + mark.gradePoints * (credits.get(mark.courseId) ?? 0), 0) / totalCU : null;
      const ledger = ledgers.find(row => row.periodId === period._id);
      return [{ id: registration._id, name: period.name, year: period.year, yearOfStudy: registration.yearOfStudy, semester: registration.semester, startDate: period.startDate, endDate: period.endDate, gpa, feesPercentage: ledger && ledger.totalDue > 0 ? Math.min(100, Math.round(ledger.totalPaid / ledger.totalDue * 100)) : 0 }];
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const currentMarks = approved.filter(mark => mark.periodId === student.currentPeriodId);
    const currentPeriod = student.currentPeriodId ? periodMap.get(student.currentPeriodId) : null;
    return {
      totalCourses: curriculum.length, completedCourses: passed.size, passed: passed.size,
      failed: [...failed].filter(id => !passed.has(id)).length, semesters: registrations.length,
      courseworkEntered: currentMarks.filter(mark => mark.courseworkMarks > 0).length,
      finalsApproved: currentMarks.filter(mark => mark.status === "approved").length,
      periodDates: currentPeriod ? { startDate: currentPeriod.startDate, endDate: currentPeriod.endDate } : null,
      timeline,
    };
  },
});

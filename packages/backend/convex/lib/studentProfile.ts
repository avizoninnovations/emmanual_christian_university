import { components } from "../_generated/api.js";
import type { QueryCtx } from "../_generated/server.js";
import { assertAuthenticated } from "./utils.js";
import { getDegreeClassification } from "./academicStanding.js";
import { publishedAssessment } from "./academicResults.js";

export async function getStudentProfile(ctx: QueryCtx) {
  const userId = await assertAuthenticated(ctx);
  const student = await ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", userId)).unique();
  if (!student) return null;
  const [program, authUser, activePeriod, assessments] = await Promise.all([
    ctx.db.get(student.programId),
    ctx.runQuery(components.betterAuth.adapter.findOne, { model: "user", where: [{ field: "_id", value: userId, operator: "eq" }] }),
    student.currentPeriodId ? ctx.db.get(student.currentPeriodId) : ctx.db.query("academicPeriods").withIndex("by_status", q => q.eq("status", "active")).first(),
    ctx.db.query("studentAssessments").withIndex("by_student", q => q.eq("studentId", student._id)).order("desc").take(300),
  ]);
  const department = program ? await ctx.db.get(program.departmentId) : null;
  const faculty = department ? await ctx.db.get(department.facultyId) : null;
  const [ledger, registration, sponsor, imageUrl] = await Promise.all([
    activePeriod ? ctx.db.query("studentLedger").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", activePeriod._id)).unique() : null,
    activePeriod ? ctx.db.query("studentSemesterRegistrations").withIndex("by_student_period", q => q.eq("studentId", student._id).eq("periodId", activePeriod._id)).unique() : null,
    student.sponsorId ? ctx.db.get(student.sponsorId) : null,
    student.photoId ? ctx.storage.getUrl(student.photoId) : null,
  ]);
  const approved = assessments.flatMap(mark => { const published = publishedAssessment(mark); return published ? [published] : []; });
  const courseIds = [...new Set(approved.map(mark => mark.courseId))];
  const courses = await Promise.all(courseIds.map(id => ctx.db.get(id)));
  const courseMap = new Map(courses.flatMap(course => course ? [[course._id, course] as const] : []));
  let totalCU = 0;
  let weightedPoints = 0;
  for (const mark of approved) {
    const credits = courseMap.get(mark.courseId)?.creditUnits ?? 3;
    totalCU += credits;
    weightedPoints += credits * mark.gradePoints;
  }
  const cgpa = totalCU ? Number((weightedPoints / totalCU).toFixed(2)) : 0;
  const { classification, standing } = getDegreeClassification(cgpa);
  const personalName = [student.firstName, student.otherName, student.surname].filter(Boolean).join(" ");
  return {
    studentId: student._id, userId, name: personalName || authUser?.name || "Student",
    email: student.contactEmail ?? authUser?.email ?? "", phone: student.phone ?? "",
    firstName: student.firstName ?? "", surname: student.surname ?? "", otherName: student.otherName ?? "",
    gender: student.gender ?? "", dateOfBirth: student.dateOfBirth ?? "", nationality: student.nationality ?? "",
    address: student.address ?? "", emergencyContact: student.emergencyContact ?? null,
    yearOfEntry: student.yearOfEntry ?? null, programType: student.programType ?? "",
    imageUrl: imageUrl ?? authUser?.image ?? null,
    registrationNumber: student.registrationNumber, accessNumber: student.accessNumber ?? "",
    yearOfStudy: student.yearOfStudy, semester: student.term || 1,
    status: student.status, financeStatus: student.financeStatus,
    onSemester: registration?.status === "registered", registration,
    sponsorName: sponsor?.name ?? "Self-sponsored",
    program: { _id: program?._id, name: program?.name ?? "Undergraduate Program", code: program?.code ?? "—", level: program?.level ?? "Bachelor", durationYears: program?.durationYears ?? 4 },
    department: { _id: department?._id, name: department?.name ?? "Academic Department", code: department?.code ?? "—" },
    faculty: { name: faculty?.name ?? "Not provided", code: faculty?.code ?? "" },
    currentPeriod: activePeriod ? { _id: activePeriod._id, name: activePeriod.name, term: activePeriod.term, year: activePeriod.year } : null,
    financial: { totalBilled: ledger?.totalDue ?? 0, totalPaid: ledger?.totalPaid ?? 0, balance: ledger?.balance ?? 0, clearanceStatus: ledger?.status ?? student.financeStatus },
    academics: { cgpa, totalCreditUnitsEarned: totalCU, degreeClassification: classification, academicStanding: standing },
  };
}

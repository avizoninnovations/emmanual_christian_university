import { z } from "zod";
import type { Id } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import fixture from "../seed-data/ecu-demo-seed.json";

export function demoStudentProfile(student: typeof fixture.studentAccounts[number]) {
  return {
    firstName: student.firstName, surname: student.surname, otherName: student.otherName,
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).parse(student.gender),
    dateOfBirth: student.dateOfBirth, nationality: student.nationality,
    address: student.address, phone: student.phone, contactEmail: student.contactEmail,
    emergencyContact: student.emergencyContact, yearOfEntry: student.yearOfEntry,
    programType: z.enum(["Day", "Evening", "Weekend", "Distance"]).parse(student.programType),
    accessNumber: student.accessNumber, legacyRegistrationNumber: student.legacyRegistrationNumber,
    loginEmail: student.email,
  };
}

type SeedReferences = {
  studentIds: Record<string, Id<"students">>;
  courseIds: Record<string, Id<"courses">>;
  periodIds: Record<string, Id<"academicPeriods">>;
  staffIds: Record<string, string>;
  now: number;
};

const applicationStatus = z.enum(["submitted", "under_review", "approved", "rejected"]);

/** Synthetic fixtures only. Every upsert uses a stable key so reruns are safe. */
export async function seedPortalServices(ctx: MutationCtx, refs: SeedReferences) {
  const { studentIds, courseIds, periodIds, staffIds, now } = refs;
  const timestamps = { createdAt: now, updatedAt: now };
  let inserted = 0;
  for (const student of fixture.studentAccounts) {
    const studentId = studentIds[student.registrationNumber]!;
    for (const period of fixture.academicPeriods) {
      const periodId = periodIds[period.key]!;
      const existing = await ctx.db.query("studentSemesterRegistrations").withIndex("by_student_period", q => q.eq("studentId", studentId).eq("periodId", periodId)).unique();
      if (!existing) {
        const cleared = student.financeStatus === "cleared";
        await ctx.db.insert("studentSemesterRegistrations", {
          studentId, periodId, yearOfStudy: student.yearOfStudy, semester: period.term,
          status: "registered", registeredAt: Date.parse(`${period.startDate}T00:00:00Z`),
          registeredBy: "Academic Registrar", academicClearedBy: "Academic Registrar",
          accountsClearedBy: cleared ? "Finance Officer" : undefined,
          accountsClearedAt: cleared ? now : undefined,
          cafeteriaStatus: "Non-resident", mealPlan: "No meal", residenceStatus: "Non-resident",
          accommodationType: "None", ...timestamps,
        });
        inserted++;
      }
    }
  }
  for (const row of fixture.studentServices.aegrotatApplications) {
    const studentId = studentIds[row.studentRegistrationNumber]!;
    const periodId = periodIds[row.periodKey]!;
    const courseId = courseIds[row.courseCode]!;
    const existing = await ctx.db.query("aegrotatApplications").withIndex("by_student_period", q => q.eq("studentId", studentId).eq("periodId", periodId)).take(30);
    if (!existing.some(item => item.courseId === courseId)) {
      await ctx.db.insert("aegrotatApplications", { studentId, periodId, courseId, applicationType: "illness", reason: row.reason, status: applicationStatus.parse(row.status), submittedAt: now, ...timestamps });
      inserted++;
    }
  }
  for (const row of fixture.studentServices.deadSemesterRequests) {
    const studentId = studentIds[row.studentRegistrationNumber]!;
    const existing = await ctx.db.query("deadSemesterRequests").withIndex("by_student", q => q.eq("studentId", studentId)).take(50);
    if (!existing.some(item => item.targetYear === row.targetYear && item.targetTerm === row.targetTerm)) {
      await ctx.db.insert("deadSemesterRequests", { studentId, targetYear: row.targetYear, targetTerm: row.targetTerm, reason: row.reason, status: applicationStatus.parse(row.status), submittedAt: now, ...timestamps });
      inserted++;
    }
  }
  for (const row of fixture.studentServices.lecturerEvaluations) {
    const studentId = studentIds[row.studentRegistrationNumber]!;
    const courseId = courseIds[row.courseCode]!;
    const periodId = periodIds[row.periodKey]!;
    const existing = await ctx.db.query("lecturerEvaluations").withIndex("by_student_course_period", q => q.eq("studentId", studentId).eq("courseId", courseId).eq("periodId", periodId)).unique();
    if (!existing) {
      await ctx.db.insert("lecturerEvaluations", { studentId, courseId, periodId, lecturerId: staffIds[row.lecturerEmail]!, responses: row.responses, comment: row.comment, submittedAt: now, ...timestamps });
      inserted++;
    }
  }
  for (const row of fixture.studentServices.internshipPlacements) {
    const studentId = studentIds[row.studentRegistrationNumber]!;
    const periodId = periodIds[row.periodKey]!;
    const existing = await ctx.db.query("internshipPlacements").withIndex("by_student_period", q => q.eq("studentId", studentId).eq("periodId", periodId)).unique();
    const placementId = existing?._id ?? await ctx.db.insert("internshipPlacements", {
      studentId, periodId, organization: row.organization, country: row.country, district: row.district,
      location: row.location, startDate: row.startDate, endDate: row.endDate, phone: row.phone, email: row.email,
      supervisorName: row.supervisorName, supervisorPhone: row.supervisorPhone, supervisorEmail: row.supervisorEmail,
      academicSupervisorName: row.academicSupervisorName, academicSupervisorPhone: row.academicSupervisorPhone,
      academicSupervisorEmail: row.academicSupervisorEmail, reviewComment: row.reviewComment,
      status: "submitted", ...timestamps,
    });
    if (!existing) inserted++;
    const tasks = await ctx.db.query("internshipLogbookTasks").withIndex("by_student_placement", q => q.eq("studentId", studentId).eq("placementId", placementId)).take(100);
    for (const task of row.tasks) {
      if (tasks.some(item => item.date === task.date && item.activity === task.activity)) continue;
      await ctx.db.insert("internshipLogbookTasks", { studentId, placementId, ...task, status: "submitted", ...timestamps });
      inserted++;
    }
    const contacts = await ctx.db.query("internshipAgencyContacts").withIndex("by_student_placement", q => q.eq("studentId", studentId).eq("placementId", placementId)).take(30);
    for (const contact of row.contacts) {
      if (contacts.some(item => item.email === contact.email)) continue;
      await ctx.db.insert("internshipAgencyContacts", { studentId, placementId, ...contact, ...timestamps });
      inserted++;
    }
  }
  for (const row of fixture.studentServices.elections) {
    const existing = await ctx.db.query("studentElections").withIndex("by_seedKey", q => q.eq("seedKey", row.key)).unique();
    const electionId = existing?._id ?? await ctx.db.insert("studentElections", { seedKey: row.key, title: row.title, description: row.description, opensAt: row.opensAt, closesAt: row.closesAt, status: "open", ...timestamps });
    if (!existing) inserted++;
    const applications = await ctx.db.query("studentElectionApplications").withIndex("by_election", q => q.eq("electionId", electionId)).take(50);
    for (const application of row.applications) {
      const studentId = studentIds[application.studentRegistrationNumber]!;
      if (applications.some(item => item.studentId === studentId && item.position === application.position)) continue;
      await ctx.db.insert("studentElectionApplications", { electionId, studentId, position: application.position, statement: application.statement, status: applicationStatus.parse(application.status), submittedAt: now, ...timestamps });
      inserted++;
    }
  }
  for (const member of fixture.studentServices.electoralCommitteeMembers) {
    const existing = await ctx.db.query("electoralCommitteeMembers").withIndex("by_email", q => q.eq("email", member.email)).unique();
    if (!existing) {
      await ctx.db.insert("electoralCommitteeMembers", { ...member, status: "active", ...timestamps });
      inserted++;
    }
  }
  return inserted;
}

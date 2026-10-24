import { publishedAssessment } from "./lib/academicResults.js";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { query } from "./_generated/server.js";
import { mutation } from "./lib/mutations.js";
import { assertAuthenticated, assertRole } from "./lib/utils.js";
import { Id } from "./_generated/dataModel.js";
import { logAction } from "./audit_logger.js";

async function getStudent(ctx: any, userId: string) {
  return await ctx.db.query("students").withIndex("by_userId", (q: any) => q.eq("userId", userId)).first();
}

async function getCurrentPeriod(ctx: any, student: any) {
  if (student?.currentPeriodId) {
    const current = await ctx.db.get(student.currentPeriodId);
    if (current) return current;
  }
  return await ctx.db.query("academicPeriods").withIndex("by_status", (q: any) => q.eq("status", "active")).first();
}

export const generateStudentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyAegrotatApplications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { period: null, courses: [], applications: [] };
    const period = await getCurrentPeriod(ctx, student);
    if (!period) return { period: null, courses: [], applications: [] };
    const registrations = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).collect();
    const courses = await Promise.all(registrations.filter((r: any) => r.status === "registered").map(async (r: any) => {
      const course = await ctx.db.get(r.courseId as Id<"courses">);
      return course ? { id: course._id, code: course.code, title: course.title } : null;
    }));
    const applications = await ctx.db.query("aegrotatApplications")
      .withIndex("by_student", (q: any) => q.eq("studentId", student._id)).order("desc").collect();
    return {
      period: { id: period._id, name: period.name, term: period.term, year: period.year },
      courses: courses.filter((course) => course !== null),
      applications: await Promise.all(applications.map(async (application: any) => {
        const course = await ctx.db.get(application.courseId as Id<"courses">);
        const attachmentUrl = application.attachmentId ? await ctx.storage.getUrl(application.attachmentId) : null;
        return { ...application, courseTitle: course?.title ?? "Course", attachmentUrl };
      })),
    };
  },
});

export const submitAegrotatApplication = mutation({
  args: { courseId: v.id("courses"), reason: v.string(), attachmentId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("There is no active academic period.");
    const registration = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id))
      .filter((q: any) => q.eq(q.field("courseId"), args.courseId)).first();
    if (!registration || registration.status !== "registered") throw new ConvexError("Select a course you are registered in this semester.");
    if (args.reason.trim().length < 10) throw new ConvexError("Please provide more detail about your application.");
    return await ctx.db.insert("aegrotatApplications", {
      studentId: student._id, periodId: period._id, courseId: args.courseId,
      reason: args.reason.trim(), attachmentId: args.attachmentId,
      status: "submitted", submittedAt: Date.now(),
    });
  },
});

export const getMyDeadSemesterRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return [];
    return await ctx.db.query("deadSemesterRequests").withIndex("by_student", (q: any) => q.eq("studentId", student._id)).order("desc").collect();
  },
});

export const submitDeadSemesterRequest = mutation({
  args: { targetYear: v.number(), targetTerm: v.number(), reason: v.string(), attachmentId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    if (args.targetYear < 1 || args.targetTerm < 1 || args.targetTerm > 3) throw new ConvexError("Select a valid year and semester.");
    if (args.reason.trim().length < 10) throw new ConvexError("Please provide more detail about your request.");
    return await ctx.db.insert("deadSemesterRequests", {
      studentId: student._id, targetYear: args.targetYear, targetTerm: args.targetTerm,
      reason: args.reason.trim(), attachmentId: args.attachmentId,
      status: "submitted", submittedAt: Date.now(),
    });
  },
});

export const getMyEvaluationOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { period: null, evaluations: [] };
    const period = await getCurrentPeriod(ctx, student);
    if (!period) return { period: null, evaluations: [] };
    const registrations = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).collect();
    const users = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user", paginationOpts: { cursor: null, numItems: 2000 },
    }).catch(() => ({ page: [] }));
    const userMap = new Map<string, string>((users.page ?? []).map((user: any) => [String(user._id), String(user.name)] as [string, string]));
    const evaluations = await Promise.all(registrations.filter((r: any) => r.status === "registered").map(async (registration: any) => {
      const allocations = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q: any) =>
        q.eq("courseId", registration.courseId).eq("periodId", period._id)).collect();
      const course = await ctx.db.get(registration.courseId as Id<"courses">);
      return Promise.all(allocations.map(async (allocation: any) => {
        const existing = await ctx.db.query("lecturerEvaluations").withIndex("by_student_course_period", (q: any) =>
          q.eq("studentId", student._id).eq("courseId", registration.courseId).eq("periodId", period._id)).filter((q: any) =>
            q.eq(q.field("lecturerId"), allocation.lecturerId)).first();
        return {
          courseId: registration.courseId,
          courseTitle: course?.title ?? "Course",
          courseCode: course?.code ?? "—",
          lecturerId: allocation.lecturerId,
          lecturerName: String(userMap.get(allocation.lecturerId) ?? "Academic Staff"),
          submitted: !!existing,
        };
      }));
    }));
    return { period: { id: period._id, name: period.name, term: period.term, year: period.year }, evaluations: evaluations.flat() };
  },
});

export const submitLecturerEvaluation = mutation({
  args: {
    courseId: v.id("courses"), lecturerId: v.string(),
    responses: v.array(v.object({ question: v.string(), rating: v.number() })),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("No active academic semester is available.");
    const registration = await ctx.db.query("studentCourseRegistrations")
      .withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id))
      .filter((q: any) => q.eq(q.field("courseId"), args.courseId)).first();
    if (!registration || registration.status !== "registered") throw new ConvexError("You can evaluate only a lecturer teaching your registered course.");
    const allocation = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q: any) =>
      q.eq("courseId", args.courseId).eq("periodId", period._id)).filter((q: any) => q.eq(q.field("lecturerId"), args.lecturerId)).first();
    if (!allocation) throw new ConvexError("This staff member is not assigned to this course in the current semester.");
    if (args.responses.length < 3 || args.responses.some((response) => response.rating < 1 || response.rating > 5)) throw new ConvexError("Complete all evaluation ratings before submitting.");
    const existing = await ctx.db.query("lecturerEvaluations").withIndex("by_student_course_period", (q: any) =>
      q.eq("studentId", student._id).eq("courseId", args.courseId).eq("periodId", period._id)).filter((q: any) => q.eq(q.field("lecturerId"), args.lecturerId)).first();
    if (existing) throw new ConvexError("You have already submitted this evaluation.");
    return await ctx.db.insert("lecturerEvaluations", {
      studentId: student._id, lecturerId: args.lecturerId, courseId: args.courseId,
      periodId: period._id, responses: args.responses, comment: args.comment?.trim(), submittedAt: Date.now(),
    });
  },
});

const placementArgs = {
  organization: v.string(), country: v.string(), district: v.string(), location: v.string(),
  startDate: v.string(), endDate: v.string(), phone: v.string(), email: v.string(),
  supervisorName: v.string(), supervisorPhone: v.string(), supervisorEmail: v.string(),
  acceptanceLetterId: v.optional(v.id("_storage")),
};

export const getMyInternship = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { placement: null, tasks: [], contacts: [] };
    const period = await getCurrentPeriod(ctx, student);
    if (!period) return { placement: null, tasks: [], contacts: [] };
    const placement = await ctx.db.query("internshipPlacements").withIndex("by_student_period", (q: any) =>
      q.eq("studentId", student._id).eq("periodId", period._id)).first();
    if (!placement) return { placement: null, tasks: [], contacts: [] };
    const [tasks, contacts, acceptanceLetterUrl] = await Promise.all([
      ctx.db.query("internshipLogbookTasks").withIndex("by_student_placement", (q: any) => q.eq("studentId", student._id).eq("placementId", placement._id)).order("desc").collect(),
      ctx.db.query("internshipAgencyContacts").withIndex("by_student_placement", (q: any) => q.eq("studentId", student._id).eq("placementId", placement._id)).collect(),
      placement.acceptanceLetterId ? ctx.storage.getUrl(placement.acceptanceLetterId) : Promise.resolve(null),
    ]);
    return { placement: { ...placement, acceptanceLetterUrl }, tasks, contacts };
  },
});

export const saveMyInternshipPlacement = mutation({
  args: { ...placementArgs },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("No current academic semester is available.");
    for (const [label, value] of Object.entries(args)) if (label !== "acceptanceLetterId" && typeof value === "string" && !value.trim()) throw new ConvexError(`${label} is required.`);
    if (args.endDate < args.startDate) throw new ConvexError("The end date must be after the start date.");
    const existing = await ctx.db.query("internshipPlacements").withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, status: "submitted" });
      return existing._id;
    }
    return await ctx.db.insert("internshipPlacements", { studentId: student._id, periodId: period._id, ...args, status: "submitted" });
  },
});

export const addInternshipLogbookTask = mutation({
  args: { date: v.string(), activity: v.string(), lessonLearned: v.string(), skills: v.string(), challenges: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("No current academic semester is available.");
    const placement = await ctx.db.query("internshipPlacements").withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).first();
    if (!placement) throw new ConvexError("Save your internship placement details first.");
    if (!args.activity.trim() || !args.lessonLearned.trim() || !args.skills.trim()) throw new ConvexError("Complete the activity, lesson learned, and skills fields.");
    return await ctx.db.insert("internshipLogbookTasks", { studentId: student._id, placementId: placement._id, ...args, status: "submitted" });
  },
});

export const addInternshipAgencyContact = mutation({
  args: { name: v.string(), title: v.optional(v.string()), phone: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("No current academic semester is available.");
    const placement = await ctx.db.query("internshipPlacements").withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).first();
    if (!placement) throw new ConvexError("Save your internship placement details first.");
    if (!args.name.trim() || !args.phone.trim() || !args.email.trim()) throw new ConvexError("Name, phone, and email are required.");
    return await ctx.db.insert("internshipAgencyContacts", { studentId: student._id, placementId: placement._id, ...args });
  },
});

export const removeInternshipAgencyContact = mutation({
  args: { contactId: v.id("internshipAgencyContacts") },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    const contact = await ctx.db.get(args.contactId);
    if (!student || !contact || contact.studentId !== student._id) throw new ConvexError("Contact not found.");
    await ctx.db.delete(contact._id);
    return { success: true };
  },
});

export const getMyElectionOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { elections: [], applications: [] };
    const [elections, applications] = await Promise.all([
      ctx.db.query("studentElections").withIndex("by_status", (q: any) => q.eq("status", "open")).collect(),
      ctx.db.query("studentElectionApplications").withIndex("by_student", (q: any) => q.eq("studentId", student._id)).collect(),
    ]);
    const now = Date.now();
    return {
      elections: elections.filter((election: any) => election.opensAt <= now && election.closesAt >= now),
      applications,
    };
  },
});

export const submitElectionApplication = mutation({
  args: { electionId: v.id("studentElections"), position: v.string(), statement: v.string() },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const election = await ctx.db.get(args.electionId);
    const now = Date.now();
    if (!election || election.status !== "open" || election.opensAt > now || election.closesAt < now) throw new ConvexError("This election is not accepting applications.");
    if (!args.position.trim() || args.statement.trim().length < 20) throw new ConvexError("Select a position and provide a statement of at least 20 characters.");
    const existing = await ctx.db.query("studentElectionApplications").withIndex("by_election", (q: any) => q.eq("electionId", args.electionId)).filter((q: any) => q.eq(q.field("studentId"), student._id)).first();
    if (existing) throw new ConvexError("You have already submitted an application for this election.");
    return await ctx.db.insert("studentElectionApplications", { electionId: args.electionId, studentId: student._id, position: args.position.trim(), statement: args.statement.trim(), status: "submitted", submittedAt: now });
  },
});

export const getElectoralCommittee = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.db.query("electoralCommitteeMembers").withIndex("by_status", (q) => q.eq("status", "active")).collect();
  },
});

export const getMyRetakeOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) return { period: null, courses: [], registrations: [], limits: { onSemester: 2, offSemester: 1 }, usage: { onSemester: 0, offSemester: 0 } };
    const period = await getCurrentPeriod(ctx, student);
    const assessments = await ctx.db.query("studentAssessments").withIndex("by_student", (q: any) => q.eq("studentId", student._id)).take(300);
    const failed = assessments.flatMap(assessment => { const result = publishedAssessment(assessment); return result && (result.grade === "F" || result.grade === "D") ? [result] : []; });
    const failedCourseIds = [...new Set(failed.map((assessment: any) => assessment.courseId))];
    const [program, courses] = await Promise.all([
      ctx.db.get(student.programId as Id<"programs">),
      Promise.all(failedCourseIds.map(async (courseId: Id<"courses">) => {
      const course = await ctx.db.get(courseId as Id<"courses">);
      const mode = period && course?.semester === period.term ? "on_semester" : "off_semester";
      return course ? { id: course._id, code: course.code, title: course.title, grade: failed.find((a: any) => a.courseId === courseId)?.grade ?? "F", creditUnits: course.creditUnits, mode } : null;
      })),
    ]);
    const registrations = period ? await ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).take(100) : [];
    const retakes = registrations.filter((registration: any) => registration.registrationKind === "retake");
    return {
      period: period ? { id: period._id, name: period.name } : null,
      courses: courses.filter((course) => course !== null),
      registrations: retakes.map((registration: any) => ({ courseId: registration.courseId, status: registration.status, mode: registration.retakeMode ?? "on_semester" })),
      limits: { onSemester: program?.onSemesterRetakeLimit ?? 2, offSemester: program?.offSemesterRetakeLimit ?? 1 },
      usage: { onSemester: retakes.filter((registration: any) => registration.retakeMode === "on_semester").length, offSemester: retakes.filter((registration: any) => registration.retakeMode === "off_semester").length },
    };
  },
});

export const registerRetakeCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const student = await getStudent(ctx, userId);
    if (!student) throw new ConvexError("Student profile not found.");
    const period = await getCurrentPeriod(ctx, student);
    if (!period) throw new ConvexError("There is no active academic period.");
    const [course, program, assessments, registrations] = await Promise.all([
      ctx.db.get(args.courseId),
      ctx.db.get(student.programId as Id<"programs">),
      ctx.db.query("studentAssessments").withIndex("by_student_course_period", (q: any) => q.eq("studentId", student._id).eq("courseId", args.courseId)).take(30),
      ctx.db.query("studentCourseRegistrations").withIndex("by_student_period", (q: any) => q.eq("studentId", student._id).eq("periodId", period._id)).take(100),
    ]);
    if (!course) throw new ConvexError("Course not found.");
    if (!assessments.some(assessment => { const result = publishedAssessment(assessment); return result && (result.grade === "F" || result.grade === "D"); })) throw new ConvexError("This course is not eligible for retake registration.");
    const existing = registrations.find((registration: any) => registration.courseId === args.courseId);
    if (existing) throw new ConvexError("This course is already registered for the current semester.");
    const retakeMode = course.semester === period.term ? "on_semester" : "off_semester";
    const limit = retakeMode === "on_semester" ? program?.onSemesterRetakeLimit ?? 2 : program?.offSemesterRetakeLimit ?? 1;
    const used = registrations.filter((registration: any) => registration.registrationKind === "retake" && registration.retakeMode === retakeMode && registration.status !== "dropped").length;
    if (used >= limit) throw new ConvexError(`Your program allows up to ${limit} ${retakeMode === "on_semester" ? "on-semester" : "off-semester"} retake${limit === 1 ? "" : "s"}.`);
    const status = retakeMode === "on_semester" ? "registered" : "pending_approval";
    const registrationId = await ctx.db.insert("studentCourseRegistrations", { studentId: student._id, courseId: args.courseId, periodId: period._id, status, registrationKind: "retake", retakeMode });
    await logAction(ctx, { action: "REGISTER_RETAKE", resource: "studentCourseRegistrations", details: `Student ${student.registrationNumber} requested ${retakeMode} retake ${course.code}.` });
    return { registrationId, status, retakeMode };
  },
});

export const reviewOffSemesterRetake = mutation({
  args: { registrationId: v.id("studentCourseRegistrations"), approved: v.boolean() },
  handler: async (ctx, args) => {
    const { userId } = await assertRole(ctx, ["admin", "hod", "registrar"]);
    const registration = await ctx.db.get(args.registrationId);
    if (!registration || registration.registrationKind !== "retake" || registration.retakeMode !== "off_semester") throw new ConvexError("This is not an off-semester retake request.");
    if (registration.status !== "pending_approval") throw new ConvexError("This retake request has already been reviewed.");
    await ctx.db.patch(registration._id, { status: args.approved ? "registered" : "dropped", retakeApprovedBy: userId, retakeApprovedAt: Date.now() });
    await logAction(ctx, { action: args.approved ? "APPROVE_OFF_SEMESTER_RETAKE" : "REJECT_OFF_SEMESTER_RETAKE", resource: "studentCourseRegistrations", details: `Off-semester retake ${registration._id} was ${args.approved ? "approved" : "rejected"}.` });
    return { status: args.approved ? "registered" : "dropped" };
  },
});

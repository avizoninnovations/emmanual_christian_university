import { internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import { calculateGrade } from "./lib/academicResults.js";

export const seedCourseClass = internalMutation({
  args: {
    courseId: v.id("courses"), departmentId: v.id("departments"), lecturerId: v.string(), hodId: v.string(),
    periodId: v.id("academicPeriods"), wrongPeriodId: v.id("academicPeriods"),
    periodStatus: v.union(v.literal("active"), v.literal("completed"), v.literal("upcoming")),
    courseIndex: v.number(), students: v.array(v.object({ studentId: v.id("students"), yearOfStudy: v.number(), studentIndex: v.number() })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let registrations = 0;
    let assessments = 0;
    let allocation = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique();
    const misplaced = await ctx.db.query("courseAllocations").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.wrongPeriodId)).unique();
    if (allocation && misplaced) {
      const misplacedMarks = await ctx.db.query("studentAssessments").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.wrongPeriodId)).take(1);
      if (misplacedMarks.length === 0) await ctx.db.delete(misplaced._id);
    }
    if (!allocation) {
      if (misplaced) {
        const marks = await ctx.db.query("studentAssessments").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.wrongPeriodId)).take(1);
        if (marks.length === 0) {
          await ctx.db.patch(misplaced._id, { periodId: args.periodId, departmentId: args.departmentId, lecturerId: args.lecturerId, assignedBy: args.hodId, revision: (misplaced.revision ?? 0) + 1, updatedAt: now });
          allocation = { ...misplaced, periodId: args.periodId };
        }
      }
      if (!allocation) {
        await ctx.db.insert("courseAllocations", { courseId: args.courseId, departmentId: args.departmentId, periodId: args.periodId, lecturerId: args.lecturerId, assignedBy: args.hodId, revision: 1, createdAt: now, updatedAt: now });
      }
    }

    const [courseRows, assessmentRows] = await Promise.all([
      ctx.db.query("studentCourseRegistrations").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).take(100),
      ctx.db.query("studentAssessments").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).take(100),
    ]);
    const registrationsByStudent = new Set(courseRows.map((row) => row.studentId));
    const assessmentsByStudent = new Set(assessmentRows.map((row) => row.studentId));
    const assessmentStudentByStatus = new Map<string, typeof args.students[number]["studentId"]>();
    for (const row of assessmentRows) {
      if (!assessmentStudentByStatus.has(row.status)) assessmentStudentByStatus.set(row.status, row.studentId);
    }
    const fullyApproved = args.periodStatus === "active" && args.courseIndex % 5 === 0;

    for (const student of args.students) {
      if (!registrationsByStudent.has(student.studentId)) {
        await ctx.db.insert("studentCourseRegistrations", {
          studentId: student.studentId, courseId: args.courseId, periodId: args.periodId,
          status: args.periodStatus === "completed" ? "completed" : "registered",
          registrationKind: "regular", createdAt: now, updatedAt: now,
        });
      }
      registrations++;
      if (assessmentsByStudent.has(student.studentId)) {
        assessments++;
        continue;
      }
      if (args.periodStatus === "active" && !fullyApproved && student.studentIndex >= 20) continue;

      const courseworkMarks = 8 + ((student.studentIndex * 7 + args.courseIndex * 3) % 23);
      const examMarks = 5 + ((student.studentIndex * 13 + args.courseIndex * 17) % 66);
      const status = args.periodStatus === "completed" || fullyApproved || student.studentIndex < 15
        ? "approved"
        : student.studentIndex < 18 ? "submitted"
          : student.studentIndex === 18 ? "returned" : "draft";
      const examEntered = status !== "draft";
      const recordedExamMarks = examEntered ? examMarks : 0;
      const finalScore = courseworkMarks + recordedExamMarks;
      const grade = calculateGrade(finalScore);
      const approvedSnapshot = status === "approved" ? {
        courseworkMarks, examMarks: recordedExamMarks, finalScore,
        courseworkEntered: true, examEntered: true, ...grade,
        revision: 1, approvedBy: args.hodId, approvedAt: now,
      } : undefined;
      await ctx.db.insert("studentAssessments", {
        studentId: student.studentId, courseId: args.courseId, periodId: args.periodId,
        lecturerId: args.lecturerId, departmentId: args.departmentId, revision: 1,
        courseworkEntered: true, examEntered, courseworkMarks, examMarks: recordedExamMarks,
        finalScore, ...grade, status,
        submittedBy: status === "submitted" ? args.lecturerId : undefined,
        submittedAt: status === "submitted" ? now : undefined,
        returnReason: status === "returned" ? "Please review the mark details and resubmit." : undefined,
        approvedSnapshot, createdAt: now, updatedAt: now,
      });
      if (!assessmentStudentByStatus.has(status)) assessmentStudentByStatus.set(status, student.studentId);
      assessments++;
    }

    const events = await ctx.db.query("academicEvents")
      .withIndex("by_courseId_and_periodId", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId))
      .take(100);
    const eventActions = new Set(events.map((event) => event.action));
    const eventExamples = [
      { status: "approved", action: "APPROVE_RESULT", actorId: args.hodId, details: "Approved and published marks for a student." },
      { status: "submitted", action: "SUBMIT_MARKS", actorId: args.lecturerId, details: "Submitted marks for HOD review." },
      { status: "returned", action: "RETURN_RESULT", actorId: args.hodId, details: "Returned marks to the lecturer for correction." },
      { status: "draft", action: "SAVE_MARK_DRAFT", actorId: args.lecturerId, details: "Saved draft marks with missing components." },
    ] as const;
    for (const example of eventExamples) {
      if (eventActions.has(example.action)) continue;
      const studentId = assessmentStudentByStatus.get(example.status);
      if (!studentId) continue;
      await ctx.db.insert("academicEvents", {
        departmentId: args.departmentId, actorId: example.actorId, action: example.action,
        details: example.details, courseId: args.courseId, periodId: args.periodId,
        studentId, createdAt: now, updatedAt: now,
      });
    }

    const gradebook = await ctx.db.query("academicGradebooks").withIndex("by_courseId_and_periodId", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique();
    if (!gradebook) await ctx.db.insert("academicGradebooks", {
      courseId: args.courseId, periodId: args.periodId, departmentId: args.departmentId,
      reviewerId: args.hodId,
      entriesCloseAt: args.periodStatus === "active" ? Date.parse("2026-11-30T23:59:00+03:00") : undefined,
      createdAt: now, updatedAt: now,
    });
    return { registrations, assessments, allocations: 1 };
  },
});

export const seedCourseSchedule = internalMutation({
  args: {
    courseId: v.id("courses"), periodId: v.id("academicPeriods"), lecturerId: v.string(),
    dayOfWeek: v.union(v.literal("monday"), v.literal("tuesday"), v.literal("wednesday"), v.literal("thursday"), v.literal("friday")),
    startTime: v.string(), endTime: v.string(), room: v.string(), examDate: v.string(),
    examStartTime: v.string(), examEndTime: v.string(), examRoom: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const [timetable, exam] = await Promise.all([
      ctx.db.query("timetables").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique(),
      ctx.db.query("examTimetables").withIndex("by_course_period", (q) => q.eq("courseId", args.courseId).eq("periodId", args.periodId)).unique(),
    ]);
    if (!timetable) await ctx.db.insert("timetables", {
      courseId: args.courseId, periodId: args.periodId, lecturerId: args.lecturerId,
      dayOfWeek: args.dayOfWeek, startTime: args.startTime, endTime: args.endTime,
      room: args.room, building: "Academic Block", capacity: 40, createdAt: now, updatedAt: now,
    });
    if (!exam) await ctx.db.insert("examTimetables", {
      courseId: args.courseId, periodId: args.periodId, examDate: args.examDate,
      startTime: args.examStartTime, endTime: args.examEndTime, room: args.examRoom,
      venue: "Main Campus Examination Hall", createdAt: now, updatedAt: now,
    });
    return { timetable: 1, exam: 1 };
  },
});

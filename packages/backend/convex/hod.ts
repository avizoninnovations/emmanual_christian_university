import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { mutation } from "./lib/mutations.js";
import { academicActor, assertDepartmentManager, classContext, managedDepartments, staffName } from "./lib/academicAccess.js";
import { appointDepartmentHead } from "./lib/departmentLeadership.js";
import { academicEvent } from "./lib/academicAudit.js";

export const context = query({
  args: {},
  handler: async ctx => {
    const actor = await managedDepartments(ctx);
    const periods = await ctx.db.query("academicPeriods").order("desc").take(100);
    return { userId: actor.userId, isAdmin: actor.isAdmin, departments: actor.departments, periods };
  },
});

export const appointHead = mutation({
  args: { departmentId: v.id("departments"), staffUserId: v.union(v.string(), v.null()), reason: v.string() },
  handler: async (ctx, args) => appointDepartmentHead(ctx, args.departmentId, args.staffUserId, args.reason),
});

export const staffOptions = query({
  args: { departmentId: v.optional(v.id("departments")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (args.departmentId) await assertDepartmentManager(ctx, args.departmentId);
    else if (!actor.isAdmin) throw new ConvexError("Select your department.");
    const page = args.departmentId
      ? await ctx.db.query("staffProfiles").withIndex("by_departmentId", q => q.eq("departmentId", args.departmentId))
        .filter(q => q.eq(q.field("status"), "active")).paginate(args.paginationOpts)
      : await ctx.db.query("staffProfiles").withIndex("by_status", q => q.eq("status", "active")).paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async profile => ({
      ...profile, ...await staffName(ctx, profile.userId),
    }))) };
  },
});

export const lecturerOptions = query({
  args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertDepartmentManager(ctx, args.departmentId);
    const page = await ctx.db.query("staffProfiles")
      .withIndex("by_status", q => q.eq("status", "active"))
      .paginate(args.paginationOpts);
    const lecturers = page.page.filter(profile =>
      profile.roles.some(role => ["lecturer", "senior_lecturer", "hod"].includes(role)),
    );
    return {
      ...page,
      page: await Promise.all(lecturers.map(async profile => ({
        ...profile,
        ...await staffName(ctx, profile.userId),
      }))),
    };
  },
});

export const courses = query({
  args: { departmentId: v.id("departments"), periodId: v.id("academicPeriods"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertDepartmentManager(ctx, args.departmentId);
    const page = await ctx.db.query("courses").withIndex("by_department", q => q.eq("departmentId", args.departmentId))
      .filter(q => q.eq(q.field("status"), "active"))
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async course => {
      const [allocation, program, registrations, assessments] = await Promise.all([
        ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId)).unique(),
        ctx.db.get(course.programId),
        ctx.db.query("studentCourseRegistrations").withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId)).take(501),
        ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId)).take(501),
      ]);
      const enrolledStudentIds = [...new Set(registrations
        .filter(row => row.status === "registered" || row.status === "completed")
        .map(row => row.studentId))];
      const marksByStudent = new Map(assessments.map(mark => [mark.studentId, mark]));
      const markForStudent = (studentId: typeof enrolledStudentIds[number]) => marksByStudent.get(studentId);
      const marksEnteredCount = enrolledStudentIds.filter(studentId => hasEnteredMark(markForStudent(studentId))).length;
      const submittedCount = enrolledStudentIds.filter(studentId => markForStudent(studentId)?.status === "submitted").length;
      const approvedCount = enrolledStudentIds.filter(studentId => {
        const mark = marksByStudent.get(studentId);
        return mark?.status === "approved" && !mark.publicationWithdrawn;
      }).length;
      const draftCount = enrolledStudentIds.filter(studentId => {
        const mark = markForStudent(studentId);
        return hasEnteredMark(mark) && (mark?.status === "draft" || mark?.status === "returned");
      }).length;
      const fullyApproved = enrolledStudentIds.length > 0 && registrations.length < 501
        && assessments.length < 501 && approvedCount === enrolledStudentIds.length;
      return { ...course, programName: program?.name ?? "", allocation, hasMarks: marksEnteredCount > 0, hasSubmitted: submittedCount > 0,
        fullyApproved, studentCount: enrolledStudentIds.length, marksEnteredCount, submittedCount, approvedCount, draftCount,
        lecturerName: allocation ? (await staffName(ctx, allocation.lecturerId)).name : "Unassigned" };
    })) };
  },
});

function hasEnteredMark(mark: Doc<"studentAssessments"> | undefined) {
  return !!mark && ((mark.approvedSnapshot?.courseworkEntered ?? mark.courseworkEntered) !== false
    || (mark.approvedSnapshot?.examEntered ?? mark.examEntered) !== false);
}

export const overview = query({
  args: { departmentId: v.id("departments"), periodId: v.id("academicPeriods") },
  handler: async (ctx, args) => {
    const { department } = await assertDepartmentManager(ctx, args.departmentId);
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new ConvexError("Choose a valid semester.");

    const [courseRows, allocationRows, eventRows] = await Promise.all([
      ctx.db.query("courses").withIndex("by_department", q => q.eq("departmentId", args.departmentId))
        .filter(q => q.eq(q.field("status"), "active")).take(301),
      ctx.db.query("courseAllocations").withIndex("by_department_period", q => q.eq("departmentId", args.departmentId).eq("periodId", args.periodId)).take(301),
      ctx.db.query("academicEvents").withIndex("by_departmentId", q => q.eq("departmentId", args.departmentId)).order("desc").take(100),
    ]);

    const courses = courseRows.slice(0, 300);
    const courseIds = new Set(courses.map(course => course._id));
    const allocations = allocationRows.filter(allocation => courseIds.has(allocation.courseId));
    const assignedCourseIds = new Set(allocations.map(allocation => allocation.courseId));
    const lecturerCourses = new Map<string, Set<string>>();
    for (const allocation of allocations) {
      const assigned = lecturerCourses.get(allocation.lecturerId) ?? new Set<string>();
      assigned.add(allocation.courseId);
      lecturerCourses.set(allocation.lecturerId, assigned);
    }

    const workload = [...lecturerCourses.entries()]
      .map(([userId, courseIds]) => ({ userId, courseCount: courseIds.size }))
      .sort((left, right) => right.courseCount - left.courseCount)
      .slice(0, 6);
    const recentEvents = eventRows.filter(event => event.periodId === args.periodId).slice(0, 8);
    const staffIds = [...new Set([
      ...workload.map(item => item.userId),
      ...recentEvents.map(event => event.actorId).filter(id => id !== "system"),
    ])];
    const eventCourseIds = [...new Set(recentEvents.flatMap(event => event.courseId ? [event.courseId] : []))];
    const [staff, eventCourses] = await Promise.all([
      Promise.all(staffIds.map(async id => [id, await staffName(ctx, id)] as const)),
      Promise.all(eventCourseIds.map(async id => [id, await ctx.db.get(id)] as const)),
    ]);
    const staffById = new Map(staff);
    const eventCourseById = new Map(eventCourses);

    return {
      departmentName: department.name,
      periodName: `${period.name} ${period.year}`,
      activeCourseCount: courses.length,
      courseCountCapped: courseRows.length > 300,
      assignedCourseCount: courses.filter(course => assignedCourseIds.has(course._id)).length,
      unassignedCourseCount: courses.filter(course => !assignedCourseIds.has(course._id)).length,
      lecturerCount: lecturerCourses.size,
      lecturerWorkload: workload.map(item => ({
        name: staffById.get(item.userId)?.name ?? "Staff member",
        courseCount: item.courseCount,
      })),
      recentEvents: recentEvents.map(event => ({
        _id: event._id,
        actorName: event.actorId === "system" ? "System" : staffById.get(event.actorId)?.name ?? "Staff member",
        action: event.action,
        details: event.details,
        createdAt: event.createdAt,
        courseLabel: event.courseId
          ? `${eventCourseById.get(event.courseId)?.code ?? "Course"} · ${eventCourseById.get(event.courseId)?.title ?? "Course unit"}`
          : null,
      })),
    };
  },
});

export const activity = query({
  args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertDepartmentManager(ctx, args.departmentId);
    const page = await ctx.db.query("academicEvents")
      .withIndex("by_departmentId", q => q.eq("departmentId", args.departmentId))
      .order("desc").paginate(args.paginationOpts);
    const staffIds = [...new Set(page.page.map(event => event.actorId))];
    const courseIds = [...new Set(page.page.flatMap(event => event.courseId ? [event.courseId] : []))];
    const periodIds = [...new Set(page.page.flatMap(event => event.periodId ? [event.periodId] : []))];
    const studentIds = [...new Set(page.page.flatMap(event => event.studentId ? [event.studentId] : []))];
    const [staff, courses, periods, students] = await Promise.all([
      Promise.all(staffIds.map(async id => [id, await staffName(ctx, id)] as const)),
      Promise.all(courseIds.map(async id => [id, await ctx.db.get(id)] as const)),
      Promise.all(periodIds.map(async id => [id, await ctx.db.get(id)] as const)),
      Promise.all(studentIds.map(async id => [id, await ctx.db.get(id)] as const)),
    ]);
    const staffById = new Map(staff);
    const coursesById = new Map(courses);
    const periodsById = new Map(periods);
    const studentsById = new Map(students);
    return {
      ...page,
      page: page.page.map(event => {
        const course = event.courseId ? coursesById.get(event.courseId) : null;
        const period = event.periodId ? periodsById.get(event.periodId) : null;
        const student = event.studentId ? studentsById.get(event.studentId) : null;
        return {
          ...event,
          actorName: staffById.get(event.actorId)?.name ?? (event.actorId === "system" ? "System" : "Staff member"),
          courseLabel: course ? `${course.code} · ${course.title}` : "—",
          periodLabel: period ? `${period.name} ${period.year}` : "—",
          studentLabel: student ? `${student.firstName} ${student.surname} (${student.registrationNumber})` : "—",
        };
      }),
    };
  },
});

export const reviewAssignments = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await academicActor(ctx);
    if (!actor.profile.roles.includes("hod") && !actor.isAdmin) throw new ConvexError("An HOD account is required.");
    const page = await ctx.db.query("academicGradebooks").withIndex("by_reviewerId_and_periodId", q => q.eq("reviewerId", actor.userId))
      .order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async book => {
      const [course, period, pending] = await Promise.all([
        ctx.db.get(book.courseId), ctx.db.get(book.periodId),
        ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", book.courseId).eq("periodId", book.periodId))
          .filter(q => q.eq(q.field("status"), "submitted")).first(),
      ]);
      return { ...book, courseCode: course?.code ?? "Course", courseTitle: course?.title ?? "Course unit",
        periodName: period ? `${period.name} ${period.year}` : "Semester", hasSubmitted: !!pending };
    })) };
  },
});

export const configureGradebook = mutation({
  args: { courseId: v.id("courses"), periodId: v.id("academicPeriods"),
    entriesCloseAt: v.optional(v.union(v.number(), v.null())), reviewerId: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const context = await classContext(ctx, args.courseId, args.periodId);
    if (!context.isManager) throw new ConvexError("Only the department HOD can set the entry deadline.");
    if (args.reviewerId !== undefined && !context.isAdmin) throw new ConvexError("Only a system administrator can nominate an independent reviewer.");
    if (args.reviewerId) {
      const reviewer = await ctx.db.query("staffProfiles").withIndex("by_userId", q => q.eq("userId", args.reviewerId!)).unique();
      if (!reviewer || reviewer.status !== "active" || !reviewer.roles.includes("hod") || args.reviewerId === context.allocation?.lecturerId) {
        throw new ConvexError("Choose an active HOD who does not teach this class.");
      }
    }
    if (typeof args.entriesCloseAt === "number" && !Number.isFinite(args.entriesCloseAt)) throw new ConvexError("Enter a valid deadline.");
    const values = {
      entriesCloseAt: args.entriesCloseAt === undefined ? context.book?.entriesCloseAt : args.entriesCloseAt ?? undefined,
      reviewerId: args.reviewerId === undefined ? context.book?.reviewerId : args.reviewerId ?? undefined,
      updatedAt: Date.now(),
    };
    if (context.book) await ctx.db.patch(context.book._id, values);
    else await ctx.db.insert("academicGradebooks", { ...values, courseId: args.courseId, periodId: args.periodId,
      departmentId: context.course.departmentId, createdAt: Date.now() });
    await academicEvent(ctx, { actorId: context.userId, departmentId: context.course.departmentId,
      courseId: args.courseId, periodId: args.periodId, action: "CONFIGURE_GRADEBOOK", details: `Updated marks deadline or reviewer for ${context.course.code}.` });
  },
});

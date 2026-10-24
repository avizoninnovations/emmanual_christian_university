import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
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

export const courses = query({
  args: { departmentId: v.id("departments"), periodId: v.id("academicPeriods"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertDepartmentManager(ctx, args.departmentId);
    const page = await ctx.db.query("courses").withIndex("by_department", q => q.eq("departmentId", args.departmentId))
      .filter(q => q.eq(q.field("status"), "active"))
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async course => {
      const [allocation, program, submitted] = await Promise.all([
        ctx.db.query("courseAllocations").withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId)).unique(),
        ctx.db.get(course.programId),
        ctx.db.query("studentAssessments").withIndex("by_course_period", q => q.eq("courseId", course._id).eq("periodId", args.periodId)).filter(q => q.eq(q.field("status"), "submitted")).first(),
      ]);
      return { ...course, programName: program?.name ?? "", allocation, hasSubmitted: !!submitted,
        lecturerName: allocation ? (await staffName(ctx, allocation.lecturerId)).name : "Unassigned" };
    })) };
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
      courseId: args.courseId, periodId: args.periodId, action: "CONFIGURE_GRADEBOOK", details: `Updated entry deadline/reviewer for ${context.course.code}.` });
  },
});

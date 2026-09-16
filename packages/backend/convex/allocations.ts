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

// ─────────────────────────────────────────────────────────
// 1. LECTURER TEACHING ALLOCATIONS
// ─────────────────────────────────────────────────────────

export const getLecturerCourses = query({
  args: {
    periodId: v.optional(v.id("academicPeriods")),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    let periodId = args.periodId;
    if (!periodId) {
      const activePeriod = await ctx.db
        .query("academicPeriods")
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    // Query allocations for this lecturer
    const allocations = await ctx.db
      .query("courseAllocations")
      .withIndex("by_lecturer", (q: any) => q.eq("lecturerId", userId))
      .collect();

    const filtered = allocations.filter((a) => a.periodId === periodId);

    // Enrich with Course details and enrolled student count
    const enriched = await Promise.all(
      filtered.map(async (a) => {
        const course = await ctx.db.get(a.courseId);
        const department = course?.departmentId ? await ctx.db.get(course.departmentId) : null;
        const program = course?.programId ? await ctx.db.get(course.programId) : null;

        // Count enrolled students in this course
        const studentRegistrations = await ctx.db
          .query("studentCourseRegistrations")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", a.courseId).eq("periodId", a.periodId)
          )
          .collect();

        // Check overall gradebook submission status
        const assessments = await ctx.db
          .query("studentAssessments")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", a.courseId).eq("periodId", a.periodId)
          )
          .collect();

        const status =
          assessments.length === 0
            ? "draft"
            : assessments.every((s) => s.status === "approved")
            ? "approved"
            : assessments.some((s) => s.status === "submitted")
            ? "submitted"
            : assessments.some((s) => s.status === "returned")
            ? "returned"
            : "draft";

        return {
          allocationId: a._id,
          courseId: a.courseId,
          code: course?.code ?? "—",
          title: course?.title ?? "—",
          creditUnits: course?.creditUnits ?? 3,
          yearOfStudy: course?.yearOfStudy ?? 1,
          semester: course?.semester ?? 1,
          departmentName: department?.name ?? "—",
          programName: program?.name ?? "—",
          enrolledCount: studentRegistrations.length,
          gradebookStatus: status,
        };
      })
    );

    return enriched;
  },
});

// ─────────────────────────────────────────────────────────
// 2. HOD COURSE ALLOCATION MATRIX
// ─────────────────────────────────────────────────────────

export const getDepartmentAllocations = query({
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
        .withIndex("by_status", (q: any) => q.eq("status", "active"))
        .first();
      periodId = activePeriod?._id;
    }

    if (!periodId) return [];

    let courses;
    if (args.departmentId) {
      courses = await ctx.db
        .query("courses")
        .withIndex("by_department", (q: any) => q.eq("departmentId", args.departmentId!))
        .collect();
    } else {
      courses = await ctx.db.query("courses").collect();
    }

    const usersMap = await getUsersMap(ctx);

    const enriched = await Promise.all(
      courses.map(async (c) => {
        const allocation = await ctx.db
          .query("courseAllocations")
          .withIndex("by_course_period", (q: any) =>
            q.eq("courseId", c._id).eq("periodId", periodId!)
          )
          .first();

        const lecturerUser = allocation ? usersMap.get(allocation.lecturerId) : null;
        const program = await ctx.db.get(c.programId);
        const department = await ctx.db.get(c.departmentId);

        return {
          courseId: c._id,
          code: c.code,
          title: c.title,
          creditUnits: c.creditUnits,
          yearOfStudy: c.yearOfStudy,
          semester: c.semester,
          programName: program?.name ?? "—",
          departmentId: c.departmentId,
          departmentName: department?.name ?? "—",
          allocationId: allocation?._id,
          lecturerId: allocation?.lecturerId,
          lecturerName: lecturerUser?.name ?? "Unassigned",
          lecturerEmail: lecturerUser?.email ?? "—",
          isAllocated: !!allocation,
        };
      })
    );

    return enriched;
  },
});

export const allocateLecturerToCourse = mutation({
  args: {
    courseId: v.id("courses"),
    lecturerId: v.string(),
    periodId: v.id("academicPeriods"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod"]);

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new Error("Course not found");

    // Check if course is already allocated for this period
    const existing = await ctx.db
      .query("courseAllocations")
      .withIndex("by_course_period", (q: any) =>
        q.eq("courseId", args.courseId).eq("periodId", args.periodId)
      )
      .first();

    if (existing) {
      // Reassign
      await ctx.db.patch(existing._id, {
        lecturerId: args.lecturerId,
        departmentId: course.departmentId,
      });
    } else {
      // Create new allocation
      await ctx.db.insert("courseAllocations", {
        courseId: args.courseId,
        lecturerId: args.lecturerId,
        periodId: args.periodId,
        departmentId: course.departmentId,
      });
    }

    await logAction(ctx, {
      action: "ALLOCATE_COURSE",
      resource: "courseAllocations",
      details: `Allocated course ${course.code} to lecturer ${args.lecturerId}`,
    });

    return { success: true };
  },
});

export const deallocateLecturer = mutation({
  args: {
    allocationId: v.id("courseAllocations"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "hod"]);

    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) throw new Error("Allocation not found");

    const course = await ctx.db.get(allocation.courseId);
    await ctx.db.delete(args.allocationId);

    await logAction(ctx, {
      action: "DEALLOCATE_COURSE",
      resource: "courseAllocations",
      details: `Removed allocation for course ${course?.code}`,
    });
  },
});

export const getDepartmentLecturers = query({
  args: {
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);

    const usersMap = await getUsersMap(ctx);
    let profiles = await ctx.db.query("staffProfiles").collect();

    if (args.departmentId) {
      profiles = profiles.filter((p) => p.departmentId === args.departmentId);
    }

    return profiles.map((p) => {
      const user = usersMap.get(p.userId);
      return {
        userId: p.userId,
        staffId: p.staffId,
        name: user?.name ?? "Lecturer",
        email: user?.email ?? "—",
        roles: p.roles,
        title: p.title || "Lecturer",
        departmentId: p.departmentId,
      };
    });
  },
});

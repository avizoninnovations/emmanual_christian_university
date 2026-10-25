import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { staffName, assertDepartmentManager } from "./lib/academicAccess.js";

const lecturerRoles = ["lecturer", "senior_lecturer", "hod"];

export const roster = query({
  args: { departmentId: v.id("departments"), periodId: v.id("academicPeriods") },
  handler: async (ctx, args) => {
    const { department } = await assertDepartmentManager(ctx, args.departmentId);
    const period = await ctx.db.get(args.periodId);
    if (!period) throw new ConvexError("Choose a valid semester.");

    const [departmentProfiles, allocations] = await Promise.all([
      ctx.db.query("staffProfiles").withIndex("by_departmentId", q => q.eq("departmentId", args.departmentId))
        .filter(q => q.eq(q.field("status"), "active")).take(301),
      ctx.db.query("courseAllocations").withIndex("by_department_period", q =>
        q.eq("departmentId", args.departmentId).eq("periodId", args.periodId)).take(301),
    ]);
    const allocatedUserIds = [...new Set(allocations.map(row => row.lecturerId))];
    const allocatedProfiles = await Promise.all(allocatedUserIds.map(userId => ctx.db.query("staffProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId)).unique()));
    const lecturerProfiles = new Map(departmentProfiles.filter(profile => profile.roles.some(role => lecturerRoles.includes(role)))
      .map(profile => [profile.userId, profile]));
    for (const profile of allocatedProfiles) if (profile) lecturerProfiles.set(profile.userId, profile);

    const lecturerIds = [...lecturerProfiles.keys()];
    const courseIds = [...new Set(allocations.map(row => row.courseId))];
    const [names, courseDocs] = await Promise.all([
      Promise.all(lecturerIds.map(async userId => [userId, await staffName(ctx, userId)] as const)),
      Promise.all(courseIds.map(async courseId => [courseId, await ctx.db.get(courseId)] as const)),
    ]);
    const programIds = [...new Set(courseDocs.flatMap(([, course]) => course ? [course.programId] : []))];
    const programs = await Promise.all(programIds.map(async programId => [programId, await ctx.db.get(programId)] as const));
    const nameById = new Map(names);
    const courseById = new Map(courseDocs);
    const programById = new Map(programs);
    const coursesByLecturer = new Map<string, typeof courseDocs[number][1][]>();
    for (const allocation of allocations) {
      const course = courseById.get(allocation.courseId);
      if (!course) continue;
      const assigned = coursesByLecturer.get(allocation.lecturerId) ?? [];
      if (!assigned.some(item => item?._id === course._id)) assigned.push(course);
      coursesByLecturer.set(allocation.lecturerId, assigned);
    }

    const lecturers = lecturerIds.map(userId => {
      const profile = lecturerProfiles.get(userId);
      const assignedCourses = (coursesByLecturer.get(userId) ?? []).flatMap(course => course ? [{
        id: course._id, code: course.code, title: course.title,
        programName: programById.get(course.programId)?.name ?? "Program not set",
        yearOfStudy: course.yearOfStudy, semester: course.semester,
      }] : []).sort((left, right) => left.code.localeCompare(right.code));
      return {
        userId, name: nameById.get(userId)?.name ?? "Staff member", email: nameById.get(userId)?.email ?? "",
        phone: profile?.phone ?? "", staffId: profile?.staffId ?? "", title: profile?.title ?? "",
        roles: profile?.roles ?? [], accountStatus: profile?.status ?? "unlinked", assignedCourses,
        courseCount: assignedCourses.length,
      };
    }).sort((left, right) => right.courseCount - left.courseCount || left.name.localeCompare(right.name));

    return {
      departmentName: department.name, periodName: `${period.name} ${period.year}`, lecturers,
      lecturerCount: lecturers.length, teachingCount: lecturers.filter(person => person.courseCount > 0).length,
      unassignedCount: lecturers.filter(person => person.courseCount === 0).length, courseCount: courseIds.length,
      isCapped: departmentProfiles.length > 300 || allocations.length > 300,
    };
  },
});

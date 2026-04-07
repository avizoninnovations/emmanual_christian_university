// Faculties Module (University Grade)
// Manage university faculties, Dean assignments, and course allocations

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// ===== GET ALL FACULTIES =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        let faculties = await ctx.db.query("faculties").collect();

        if (args.status) {
            faculties = faculties.filter((d) => d.status === args.status);
        }

        // Batch fetch Dean names
        const deanIds = [...new Set(faculties.map(d => d.deanId).filter(Boolean))] as Id<"users">[];
        const rawDeans = await Promise.all(deanIds.map(id => ctx.db.get(id)));
        const deanMap = new Map(rawDeans.filter(Boolean).map(h => [h!._id, h]));

        const data = faculties.map((faculty) => {
            const dean = faculty.deanId ? deanMap.get(faculty.deanId) as any : null;

            return {
                ...faculty,
                deanName: dean ? `${dean.firstName} ${dean.lastName}` : "Unassigned",
                hodName: dean ? `${dean.firstName} ${dean.lastName}` : "Unassigned", // Alias for legacy UI
                facultyName: faculty.name,
            };
        });

        return { data, unauthorized: false };
    },
});

export const getDetails = query({
    args: {
        sessionId: v.optional(v.string()),
        deptId: v.id("faculties"), // Still named deptId in some UI components
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return null;

        const faculty = await ctx.db.get(args.deptId);
        if (!faculty) return null;

        const dean = faculty.deanId ? await ctx.db.get(faculty.deanId) as any : null;

        return {
            ...faculty,
            deanName: dean ? `${dean.firstName} ${dean.lastName}` : "Unassigned",
            hodName: dean ? `${dean.firstName} ${dean.lastName}` : "Unassigned",
            facultyName: faculty.name,
        };
    }
});

export const getDropdownOptions = query({
    args: { sessionId: v.optional(v.optional(v.string())) },
    handler: async (ctx, args) => {
        if (!args.sessionId) return [];
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];

        const faculties = await ctx.db.query("faculties").collect();
        return faculties.map(d => ({
            _id: d._id,
            name: d.name
        }));
    }
});

// ===== CREATE FACULTY =====

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(),
        deanId: v.optional(v.id("users")),
        courses: v.optional(v.array(v.id("courses"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:faculties");
        if (!user) return { success: false, error: "Unauthorized" };

        const existing = await ctx.db
            .query("faculties")
            .filter((q) => q.eq(q.field("name"), args.name))
            .first();

        if (existing) return { success: false, error: `A faculty named "${args.name}" already exists.` };

        const facultyId = await ctx.db.insert("faculties", {
            name: args.name,
            deanId: args.deanId,
            courses: args.courses || [],
            status: "Active",
        });

        if (args.deanId) {
            await ctx.db.patch(args.deanId, { isDean: true });
        }

        await logAction(ctx, user._id, "CREATE_FACULTY", `Created: ${args.name}`);
        return { success: true, facultyId };
    },
});

// ===== UPDATE FACULTY =====

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("faculties"),
        name: v.optional(v.string()),
        deanId: v.optional(v.id("users")),
        courses: v.optional(v.array(v.id("courses"))),
        status: v.optional(v.union(v.literal("Active"), v.literal("Inactive"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:faculties");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, id, ...updates } = args;

        if (updates.deanId) {
            await ctx.db.patch(updates.deanId, { isDean: true });
        }

        await ctx.db.patch(id, updates);
        await logAction(ctx, user._id, "UPDATE_FACULTY", `Updated: ${id}`);
        return { success: true };
    },
});

// ===== DEAN SPECIFIC QUERIES =====

export const getAssignedFaculties = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const managed = await ctx.db
            .query("faculties")
            .withIndex("by_dean", (q) => q.eq("deanId", user._id))
            .collect();

        // Also check if they are explicitly assigned via facultyIds array in user profile (if exists)
        const assignedIds = (user as any).facultyIds || [];
        const explicitlyAssigned = await Promise.all(assignedIds.map((id: any) => ctx.db.get(id)));

        const all = [...managed];
        explicitlyAssigned.forEach(d => {
            if (d && !all.some(m => m._id === d._id)) all.push(d);
        });

        return { data: all, unauthorized: false };
    },
});

// ===== FACULTY ALLOCATIONS =====

export const getFacultyAllocations = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.id("faculties"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const faculty = await ctx.db.get(args.facultyId);
        if (!faculty) return { data: [], unauthorized: false };

        const courseIdsInFaculty = new Set(faculty.courses || []);

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", q => q.eq("year", args.year).eq("semester", args.semester))
            .collect();

        const relevantAllocations = allocations.filter(a => courseIdsInFaculty.has(a.courseId));

        const lecturerIds = [...new Set(relevantAllocations.map(a => a.lecturerId))];
        const courseIds = [...new Set(relevantAllocations.map(a => a.courseId))];

        const [lecturers, courses] = await Promise.all([
            Promise.all(lecturerIds.map(id => ctx.db.get(id))),
            Promise.all(courseIds.map(id => ctx.db.get(id)))
        ]);

        const lecturerMap = new Map(lecturers.filter(Boolean).map(t => [t!._id, t]));
        const courseMap = new Map(courses.filter(Boolean).map(c => [c!._id, c]));

        const results = relevantAllocations.map((alloc) => {
            const lecturer = lecturerMap.get(alloc.lecturerId) as any;
            const course = courseMap.get(alloc.courseId);

            if (!lecturer || !course) return null;

            return {
                _id: lecturer._id,
                allocationId: alloc._id,
                lecturerName: `${lecturer.firstName} ${lecturer.lastName}`,
                firstName: lecturer.firstName,
                lastName: lecturer.lastName,
                role: lecturer.role,
                avatarUrl: lecturer.avatarUrl,
                courseCode: course.code,
                courseTitle: course.title,
                credits: course.credits,
                displayRole: `${course.code}: ${course.title} (${course.credits} Credits)`
            };
        });

        return { data: results.filter(r => r !== null), unauthorized: false };
    }
});

// ===== GET ALL COURSES IN FACULTY =====

export const getFacultyCourses = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.id("faculties"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const faculty = await ctx.db.get(args.facultyId);
        if (!faculty) return { data: [], unauthorized: false };

        const courseIds = faculty.courses || [];
        const courses = await Promise.all(courseIds.map(id => ctx.db.get(id)));

        return { data: courses.filter(Boolean), unauthorized: false };
    },
});

// ===== GET ALL LECTURERS IN FACULTY =====

export const getFacultyLecturers = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.id("faculties"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const faculty = await ctx.db.get(args.facultyId);
        if (!faculty) return { data: [], unauthorized: false };

        const courseIdsInFaculty = new Set(faculty.courses || []);

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", q => q.eq("year", args.year).eq("semester", args.semester))
            .collect();

        const relevantAllocations = allocations.filter(a => courseIdsInFaculty.has(a.courseId));
        const lecturerIds = [...new Set(relevantAllocations.map(a => a.lecturerId))];

        const lecturers = await Promise.all(lecturerIds.map(id => ctx.db.get(id)));

        return { data: lecturers.filter(Boolean), unauthorized: false };
    },
});

// ===== DELETE FACULTY =====

export const deleteFaculty = mutation({
    args: { sessionId: v.optional(v.string()), id: v.id("faculties") },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:faculties");
        if (!user) return { success: false, error: "Unauthorized" };

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_FACULTY", `Deleted: ${args.id}`);
        return { success: true };
    },
});

//  Courses Module (University Migration)
// Manage university courses

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";

// ===== GET ALL COURSES =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        status: v.optional(v.union(v.literal("Active"), v.literal("Inactive"))),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        let courses = await ctx.db.query("courses").collect();

        if (args.status) {
            courses = courses.filter((c) => c.status === args.status);
        }

        const data = courses.map(c => ({ ...c, id: c._id }));
        return { data, unauthorized: false };
    },
});

// ===== CREATE COURSE =====

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        title: v.string(),
        code: v.string(),
        description: v.optional(v.string()),
        credits: v.number(),
        facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
        programIds: v.optional(v.array(v.id("programs"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:courses");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, ...rest } = args;
        const courseId = await ctx.db.insert("courses", {
            ...rest,
            status: "Active",
        });

        await logAction(ctx, user._id, "CREATE_COURSE", `Created: ${args.title}`);
        return { success: true, courseId };
    },
});

// ===== UPDATE COURSE =====

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("courses"),
        title: v.optional(v.string()),
        code: v.optional(v.string()),
        description: v.optional(v.string()),
        credits: v.optional(v.number()),
        facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
        programIds: v.optional(v.array(v.id("programs"))),
        status: v.optional(v.union(v.literal("Active"), v.literal("Inactive"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:courses");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, id, ...updates } = args;
        await ctx.db.patch(id, updates);

        await logAction(ctx, user._id, "UPDATE_COURSE", `Updated: ${id}`);
        return { success: true };
    },
});

// ===== DELETE COURSE =====

export const deleteCourse = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("courses"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:courses");
        if (!user) return { success: false, error: "Unauthorized" };

        // Check if course is used in allocations
        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_course", q => q.eq("courseId", args.id))
            .first();

        if (allocations) {
            return { success: false, error: "You cannot delete this course as it has active lecturer allocations." };
        }

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_COURSE", `Deleted: ${args.id}`);
        return { success: true };
    },
});

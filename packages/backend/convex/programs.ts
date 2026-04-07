//  Programs Module (University Migration)
// Manage university programs (degrees, diplomas, etc.)

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";

// ===== GET ALL PROGRAMS =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        let programs = await ctx.db.query("programs").collect();

        if (args.facultyId) {
            programs = programs.filter((p) => p.facultyId === args.facultyId);
        }

        const data = programs.map(p => ({ ...p, id: p._id }));
        return { data, unauthorized: false };
    },
});

export const getById = query({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("programs"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return null;
        return await ctx.db.get(args.id);
    },
});

export const getDropdownOptions = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];
        const programs = await ctx.db.query("programs").collect();
        return programs.map(p => ({
            _id: p._id,
            name: p.name,
            code: p.code,
            coordinatorId: (p as any).coordinatorId, 
        }));
    },
});

export const getMyPrograms = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        // In university grade, we might have a specific assignment table or a coordinatorId in programs.
        // For now, let's fetch programs where they are assigned as coordinator (assuming schema has coordinatorId)
        // or if they are HOD of the department the program belongs to.
        
        const allPrograms = await ctx.db.query("programs").collect();
        const faculties = await ctx.db.query("faculties")
            .filter(q => q.eq(q.field("deanId"), user._id))
            .collect();
        const managedFacultyIds = new Set(faculties.map(d => d._id));

        const myPrograms = allPrograms.filter(p => 
            (p as any).coordinatorId === user._id || 
            (p.facultyId && managedFacultyIds.has(p.facultyId))
        );

        return { data: myPrograms, unauthorized: false };
    }
});

// ===== CREATE PROGRAM =====

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(), // e.g., Bachelor of Computer Science
        code: v.string(), // e.g., BCS
        facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
        durationYears: v.number(),
        description: v.optional(v.string()),
        awardType: v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Degree"), v.literal("Masters"), v.literal("PhD")),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:programs");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, ...rest } = args;
        const programId = await ctx.db.insert("programs", rest);

        await logAction(ctx, user._id, "CREATE_PROGRAM", `Created: ${args.name}`);
        return { success: true, programId };
    },
});

// ===== UPDATE PROGRAM =====

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("programs"),
        name: v.optional(v.string()),
        code: v.optional(v.string()),
        facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
        durationYears: v.optional(v.number()),
        description: v.optional(v.string()),
        awardType: v.optional(v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Degree"), v.literal("Masters"), v.literal("PhD"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:programs");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, id, ...updates } = args;
        await ctx.db.patch(id, updates);

        await logAction(ctx, user._id, "UPDATE_PROGRAM", `Updated: ${id}`);
        return { success: true };
    },
});

// ===== DELETE PROGRAM =====

export const deleteProgram = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("programs"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:programs");
        if (!user) return { success: false, error: "Unauthorized" };

        // Check if program is used in students
        const student = await ctx.db
            .query("students")
            .withIndex("by_program", q => q.eq("programId", args.id))
            .first();

        if (student) {
            return { success: false, error: "You cannot delete this program as it has active students." };
        }

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_PROGRAM", `Deleted: ${args.id}`);
        return { success: true };
    },
});

//  - Timetable Module (University Refactor)
// Semester-based auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";

// ===== GET TIMETABLE =====

export const getByProgram = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        // Program-specific slots using index
        const programSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", q => 
                q.eq("programId", args.programId)
                 .eq("semester", args.semester)
                 .eq("year", args.year)
            )
            .collect();

        // Combine and deduplicate
        const data = await Promise.all(
            programSlots.map(async (slot) => {
                const lecturer = slot.lecturerId ? (await ctx.db.get(slot.lecturerId)) as any : null;
                const course = await ctx.db.get(slot.courseId);
                return {
                    ...slot,
                    lecturerName: lecturer
                        ? `${lecturer.firstName} ${lecturer.lastName}`
                        : "Unknown",
                    courseTitle: course?.title || "Unknown Course"
                };
            })
        );
        return { data, unauthorized: false };
    },
});

export const getByLecturer = query({
    args: {
        sessionId: v.optional(v.string()),
        lecturerId: v.id("users"),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const hasGlobalAccess = userHasCapability(user, "access:timetable");
        if (!hasGlobalAccess && user._id !== args.lecturerId) {
            return { data: [], unauthorized: true };
        }

        let query = ctx.db
            .query("timeSlots")
            .withIndex("by_lecturer_period", (q) => q.eq("lecturerId", args.lecturerId!));

        if (args.semester && args.year) {
            query = ctx.db.query("timeSlots")
                .withIndex("by_lecturer_period", q => 
                    q.eq("lecturerId", args.lecturerId!)
                     .eq("semester", args.semester!)
                     .eq("year", args.year!)
                );
        }

        const slots = await query.collect();

        const data = await Promise.all(
            slots.map(async (slot) => {
                const course = await ctx.db.get(slot.courseId);
                const program = slot.programId ? await ctx.db.get(slot.programId) : null;
                return {
                    ...slot,
                    courseTitle: course?.title || "Unknown Course",
                    programName: program?.name || "N/A"
                };
            })
        );
        return { data, unauthorized: false };
    },
});

export const upsertSlot = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.optional(v.id("timeSlots")),
        courseId: v.id("courses"),
        programId: v.id("programs"),
        day: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        lecturerId: v.optional(v.id("users")),
        room: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "timetable:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const { id, sessionId, ...rest } = args;

        if (id) {
            await ctx.db.patch(id, rest);
        } else {
            await ctx.db.insert("timeSlots", rest);
        }

        // SYNC: Ensure course allocation exists
        if (args.lecturerId) {
            const allocation = await ctx.db
                .query("courseAllocations")
                .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
                .filter(q => q.and(
                    q.eq(q.field("semester"), args.semester),
                    q.eq(q.field("year"), args.year),
                    q.eq(q.field("programId"), args.programId)
                ))
                .first();

            if (allocation) {
                if (allocation.lecturerId !== args.lecturerId) {
                    await ctx.db.patch(allocation._id, { lecturerId: args.lecturerId });
                }
            } else {
                await ctx.db.insert("courseAllocations", {
                    lecturerId: args.lecturerId,
                    courseId: args.courseId,
                    programId: args.programId,
                    semester: args.semester,
                    year: args.year,
                });
            }
        }

        await logAction(ctx, user._id, id ? "UPDATE_TIMETABLE" : "CREATE_TIMETABLE", `Course: ${args.courseId}`);
        return { success: true };
    },
});

export const deleteSlot = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("timeSlots"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "timetable:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_TIMETABLE", `ID: ${args.id}`);
        return { success: true };
    },
});

export const getConfigs = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };
        const data = await ctx.db
            .query("timetableConfigs")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester).eq("year", args.year)
            )
            .first();

        return { data, unauthorized: false };
    },
});

export const upsertConfig = mutation({
    args: {
        sessionId: v.optional(v.string()),
        days: v.array(v.string()),
        periods: v.array(v.object({
            id: v.string(),
            startTime: v.string(),
            endTime: v.string(),
            label: v.optional(v.string()),
        })),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "timetable:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const existing = await ctx.db
            .query("timetableConfigs")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester).eq("year", args.year)
            )
            .first();

        const { sessionId, ...rest } = args;
        if (existing) {
            await ctx.db.patch(existing._id, { ...rest, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("timetableConfigs", { ...rest, updatedAt: Date.now() });
        }

        await logAction(ctx, user._id, "UPDATE_TIMETABLE_CONFIG", `S${args.semester} ${args.year}`);
        return { success: true };
    },
});

export const syncTimetable = mutation({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        sourceSemester: v.number(),
        sourceYear: v.number(),
        targetSemester: v.number(),
        targetYear: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "timetable:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const sourceSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", (q) =>
                q.eq("programId", args.programId)
                    .eq("semester", args.sourceSemester)
                    .eq("year", args.sourceYear)
            )
            .collect();

        // Delete existing targets
        const targetSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", (q) =>
                q.eq("programId", args.programId)
                    .eq("semester", args.targetSemester)
                    .eq("year", args.targetYear)
            )
            .collect();

        for (const slot of targetSlots) {
            await ctx.db.delete(slot._id);
        }

        // Copy
        for (const slot of sourceSlots) {
            const { _id, _creationTime, semester, year, ...rest } = slot;
            await ctx.db.insert("timeSlots", {
                ...rest,
                semester: args.targetSemester,
                year: args.targetYear,
            });
        }

        await logAction(ctx, user._id, "SYNC_TIMETABLE", `Program: ${args.programId} to S${args.targetSemester}`);
        return { success: true, count: sourceSlots.length };
    },
});

export const syncAllTimetables = mutation({
    args: {
        sessionId: v.optional(v.string()),
        sourceSemester: v.number(),
        sourceYear: v.number(),
        targetSemester: v.number(),
        targetYear: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "timetable:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const sourceSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.sourceSemester).eq("year", args.sourceYear)
            )
            .collect();

        // Delete existing targets for all programs
        const targetSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.targetSemester).eq("year", args.targetYear)
            )
            .collect();

        for (const slot of targetSlots) {
            await ctx.db.delete(slot._id);
        }

        // Copy
        for (const slot of sourceSlots) {
            const { _id, _creationTime, semester, year, ...rest } = slot;
            await ctx.db.insert("timeSlots", {
                ...rest,
                semester: args.targetSemester,
                year: args.targetYear,
            });
        }

        await logAction(ctx, user._id, "SYNC_ALL_TIMETABLES", `To S${args.targetSemester}`);
        return { success: true, count: sourceSlots.length };
    },
});

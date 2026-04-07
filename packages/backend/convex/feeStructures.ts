import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// Get all fee structures for a year
export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const hasAccess = userHasCapability(user, "access:finance:fees") ||
            userHasCapability(user, "access:master-data:fees");

        if (!hasAccess) {
            return { data: [], unauthorized: true };
        }

        let feeQuery = ctx.db.query("feeStructures");

        if (args.semester) {
            feeQuery = feeQuery.filter(q => q.eq(q.field("semesterNumber"), args.semester));
        }

        const structures = await feeQuery.collect();

        const programIds = [...new Set(structures.map(s => s.programId).filter(Boolean))] as Id<"programs">[];
        const programs = await Promise.all(programIds.map(id => ctx.db.get(id)));
        const programMap = new Map(programs.filter(Boolean).map(p => [p!._id, p]));

        const data = structures.map((s) => {
            const prog = s.programId ? programMap.get(s.programId as any) : null;
            return {
                ...s,
                id: s._id,
                programName: prog ? (prog as any).name : "N/A", 
            };
        });

        return { data, unauthorized: false };
    },
});

// Get fee structure for specific program and semester
export const getByProgramAndSemester = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const caps = user.capabilities || [];
        const hasAccess = caps.includes("access:master-data") ||
            caps.includes("access:master-data:fees") ||
            caps.includes("access:students:active") ||
            caps.includes("access:finance:fees");

        if (!hasAccess) {
            return { data: null, unauthorized: true };
        }

        const structure = await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", q =>
                q.eq("programId", args.programId)
                    .eq("semesterNumber", args.semester)
            )
            .first();

        return {
            data: structure ? { ...structure, id: structure._id } : null,
            unauthorized: false
        };
    },
});

// Create new fee structure
export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        tuitionFee: v.number(),
        otherFeesApplied: v.array(v.object({
            feeId: v.id("otherFees"),
            feeName: v.string(),
            amount: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to manage fee structures." };

        // Check if structure already exists
        const existing = await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", q =>
                q.eq("programId", args.programId)
                    .eq("semesterNumber", args.semester)
            )
            .first();

        if (existing) {
            return { success: false, error: `A fee structure already exists for ${args.programId}, Semester ${args.semester}.` };
        }

        const otherTotal = args.otherFeesApplied.reduce((sum: number, fee: any) => sum + fee.amount, 0);
        const total = args.tuitionFee + otherTotal;

        const structureId = await ctx.db.insert("feeStructures", {
            programId: args.programId,
            semesterNumber: args.semester,
            tuitionFee: args.tuitionFee,
            otherFeesApplied: args.otherFeesApplied,
            total,
        });

        await logAction(ctx, user._id, "CREATE_FEE_STRUCTURE", `Created for program: ${args.programId}, Semester: ${args.semester}`);

        return { success: true, structureId };
    },
});

// Update fee structure
export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("feeStructures"),
        tuitionFee: v.optional(v.number()),
        otherFeesApplied: v.optional(v.array(v.object({
            feeId: v.id("otherFees"),
            feeName: v.string(),
            amount: v.number(),
        }))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to update fee structures." };

        const existing = await ctx.db.get(args.id);
        if (!existing) {
            return { success: false, error: "We couldn't find that fee structure record." };
        }

        const tuitionFee = args.tuitionFee ?? existing.tuitionFee ?? 0;
        const otherFeesApplied = args.otherFeesApplied ?? existing.otherFeesApplied ?? [];
        const otherTotal = otherFeesApplied.reduce((sum: number, fee: any) => sum + fee.amount, 0);
        const total = tuitionFee + otherTotal;

        await ctx.db.patch(args.id, {
            ...(args.tuitionFee !== undefined && { tuitionFee: args.tuitionFee }),
            ...(args.otherFeesApplied !== undefined && { otherFeesApplied: args.otherFeesApplied }),
            total,
        });

        await logAction(ctx, user._id, "UPDATE_FEE_STRUCTURE", `Updated: ${args.id}`);

        return { success: true };
    },
});

// Delete fee structure
export const deleteFeeStructure = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("feeStructures"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to delete fee structures." };

        await ctx.db.delete(args.id);

        await logAction(ctx, user._id, "DELETE_FEE_STRUCTURE", `Deleted: ${args.id}`);

        return { success: true };
    },
});

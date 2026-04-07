import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";

// Get all other fees
export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        status: v.optional(v.union(v.literal("Active"), v.literal("Inactive"))),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const hasAccess = userHasCapability(user, "access:finance:fees") ||
            userHasCapability(user, "manage:master-data:fees");

        if (!hasAccess) {
            return { data: [], unauthorized: true };
        }

        let fees = await ctx.db.query("otherFees").collect();

        if (args.status) {
            fees = fees.filter(f => f.status === args.status);
        }

        const data = fees.map(f => ({ ...f, id: f._id }));
        return { data, unauthorized: false };
    },
});

// Get all active fees for fee structure selection
export const getActiveForSelection = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];

        const hasAccess = userHasCapability(user, "access:finance:fees") ||
            userHasCapability(user, "manage:master-data:fees");

        if (!hasAccess) return [];

        const fees = await ctx.db
            .query("otherFees")
            .withIndex("by_status", q => q.eq("status", "Active"))
            .collect();

        return fees.map(f => ({
            id: f._id,
            name: f.name,
            amount: f.amount,
            description: f.description
        }));
    },
});

// Create new other fee
export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(),
        description: v.optional(v.string()),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to create fee types." };

        const feeId = await ctx.db.insert("otherFees", {
            name: args.name,
            description: args.description,
            amount: args.amount,
            status: "Active",
        });

        await logAction(ctx, user._id, "CREATE_OTHER_FEE", `Created: ${args.name}`);

        return { success: true, feeId };
    },
});

// Update other fee
export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("otherFees"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        amount: v.optional(v.number()),
        status: v.optional(v.union(v.literal("Active"), v.literal("Inactive"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to update fee types." };

        const { sessionId, id, ...updates } = args;
        await ctx.db.patch(id, updates);

        await logAction(ctx, user._id, "UPDATE_OTHER_FEE", `Updated: ${id}`);

        return { success: true };
    },
});

// Delete other fee
export const deleteFee = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("otherFees"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:fees");
        if (!user) return { success: false, error: "You don't have permission to delete fee types." };

        await ctx.db.delete(args.id);

        await logAction(ctx, user._id, "DELETE_OTHER_FEE", `Deleted: ${args.id}`);

        return { success: true };
    },
});

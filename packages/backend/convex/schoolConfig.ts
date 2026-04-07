import { query, mutation, internalMutation, action } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUser, logAction, checkCapability, checkAnyCapability } from "./authHelpers"
import { internal } from "./_generated/api"

// Get school configuration
export const getConfig = query({
    args: {
        sessionId: v.optional(v.optional(v.string())),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db.query("schoolConfig").first()
        if (!config) return null;

        return {
            ...config,
            currency: config.currency || 'SSP',
            currencySymbol: config.currencySymbol || '£',
            schoolType: config.schoolType || 'Day',
            hasMedicalModule: config.hasMedicalModule || false,
        }
    },
})

export interface SystemStatus {
    canInitialize: boolean;
    isFirstRun?: boolean;
    reason?: string;
}

// Initialize school configuration (run once)
export const initializeConfig = action({
    args: {
        sessionId: v.optional(v.optional(v.string())),
        name: v.string(),
        motto: v.optional(v.string()),
        address: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        phones: v.optional(v.array(v.string())),
        currentSemester: v.number(),
        currentYear: v.number(),
        logoStorageId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, args): Promise<any> => {
        // 1. Check if we can proceed
        const systemStatus: SystemStatus = await ctx.runQuery(internal.schoolConfigInternal.checkSystemStatus, {
            sessionId: args.sessionId
        });

        if (!systemStatus.canInitialize) return { success: false, error: systemStatus.reason || "You don't have permission to initialize the school settings." };

        let passwordHash = "";
        if (systemStatus.isFirstRun) {
            // 2. Hash default password for first admin
            passwordHash = await ctx.runAction(internal.authActions.hashPasswordAction, {
                password: "password123"
            });
        }

        // 3. Finalize initialization via internal mutation
        await ctx.runMutation(internal.schoolConfigInternal.initializeConfigInternal, {
            ...args,
            passwordHash: passwordHash || undefined,
            isFirstRun: systemStatus.isFirstRun as boolean
        });

        return { success: true };
    },
})

// Update school configuration
export const updateConfig = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.optional(v.string()),
        motto: v.optional(v.string()),
        address: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        phone: v.optional(v.string()),
        phones: v.optional(v.array(v.string())),
        website: v.optional(v.string()),
        semesterStartDate: v.optional(v.string()),
        semesterEndDate: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        logoStorageId: v.optional(v.id("_storage")),
        currentSemester: v.optional(v.number()),
        currentYear: v.optional(v.number()),
        currency: v.optional(v.string()),
        currencySymbol: v.optional(v.string()),
        schoolType: v.optional(v.union(v.literal("Day"), v.literal("Boarding"), v.literal("Both"))),
        hasMedicalModule: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:system:settings:school");
        if (!user) return { success: false, error: "You don't have permission to update school settings." };

        const config = await ctx.db.query("schoolConfig").first()
        if (!config) {
            return { success: false, error: "We couldn't find the school configuration." };
        }

        const updates: any = {}
        if (args.name !== undefined) updates.name = args.name
        if (args.motto !== undefined) updates.motto = args.motto
        if (args.address !== undefined) updates.address = args.address
        if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail
        if (args.phone !== undefined) updates.phone = args.phone
        if (args.phones !== undefined) updates.phones = args.phones
        if (args.website !== undefined) updates.website = args.website
        if (args.semesterStartDate !== undefined) updates.semesterStartDate = args.semesterStartDate
        if (args.semesterEndDate !== undefined) updates.semesterEndDate = args.semesterEndDate
        if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl
        if (args.currentSemester !== undefined) updates.currentSemester = args.currentSemester
        if (args.currency !== undefined) updates.currency = args.currency
        if (args.currencySymbol !== undefined) updates.currencySymbol = args.currencySymbol
        if (args.hasMedicalModule !== undefined) updates.hasMedicalModule = args.hasMedicalModule

        // Handle logo storage and cleanup
        if (args.logoStorageId !== undefined) {
            // 1. Delete old logo if it exists
            if (config.logoStorageId && config.logoStorageId !== args.logoStorageId) {
                try {
                    await ctx.storage.delete(config.logoStorageId);
                    console.log("Deleted old school badge from storage");
                } catch (err) {
                    console.warn("Failed to delete old school badge:", err);
                }
            }

            // 2. Update storageId and get new URL
            updates.logoStorageId = args.logoStorageId;
            if (args.logoStorageId) {
                const newUrl = await ctx.storage.getUrl(args.logoStorageId);
                if (newUrl) updates.logoUrl = newUrl;
            } else {
                updates.logoUrl = undefined;
            }
        }

        await ctx.db.patch(config._id, updates)

        await logAction(ctx, user._id, "UPDATE_SETTINGS", "Updated school configuration")
        return { success: true }
    },
})

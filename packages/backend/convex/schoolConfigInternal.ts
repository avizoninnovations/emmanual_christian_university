import { query, internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUser, logAction, checkCapability } from "./authHelpers"
import { Doc } from "./_generated/dataModel"
import { PERMISSION_DEFINITIONS } from "./permissions_definitions"

export interface SystemStatus {
    canInitialize: boolean;
    isFirstRun?: boolean;
    reason?: string;
}

// Internal check for system status
export const checkSystemStatus = internalQuery({
    args: { sessionId: v.optional(v.optional(v.string())) },
    handler: async (ctx, args): Promise<SystemStatus> => {
        const existingConfig = await ctx.db.query("schoolConfig").first();
        if (existingConfig) {
            return { canInitialize: false, reason: "School configuration already initialized" };
        }

        if (args.sessionId) {
            const user = await checkCapability(ctx, args.sessionId, "access:system:settings:school");
            if (!user) return { canInitialize: false, reason: "Unauthorized" };
            return { canInitialize: true, isFirstRun: false };
        }

        // Anonymous initialization allowed ONLY IF no users exist
        const anyUser = await ctx.db.query("users").first();
        if (anyUser) {
            return { canInitialize: false, reason: "Unauthorized: System already has users. Please sign in to configure." };
        }

        return { canInitialize: true, isFirstRun: true };
    }
})

// Internal mutation to handle the DB inserts
export const initializeConfigInternal = internalMutation({
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
        passwordHash: v.optional(v.string()),
        isFirstRun: v.boolean(),
    },
    handler: async (ctx, args): Promise<void> => {
        let userId;

        if (args.isFirstRun) {
            // Create the first admin user
            userId = await ctx.db.insert("users", {
                email: "system.admin@eduspark.com",
                firstName: "System",
                lastName: "Admin",
                role: "SystemAdmin",
                capabilities: PERMISSION_DEFINITIONS.map(d => d.key),
                isActive: true,
                contact: "0000000000",
                gender: "Male",
                passwordHash: args.passwordHash!,
                createdAt: Date.now(),
            });
        } else {
            const user = await getAuthUser(ctx, args.sessionId!);
            if (!user) return; // internalMutation returning void, just return
            userId = user._id;
        }

        // Create academic period
        const periodId = await ctx.db.insert("academicPeriods", {
            semester: args.currentSemester,
            year: args.currentYear,
            name: `Semester ${args.currentSemester} ${args.currentYear}`,
            status: "Active",
            createdAt: Date.now(),
            createdBy: userId,
        })

        // Get logo URL if storage ID provided
        let logoUrl = "";
        if (args.logoStorageId) {
            const url = await ctx.storage.getUrl(args.logoStorageId);
            if (url) logoUrl = url;
        }

        await ctx.db.insert("schoolConfig", {
            name: args.name,
            motto: args.motto || "",
            address: args.address || "",
            contactEmail: args.contactEmail || "",
            phone: args.phones?.[0] || "",
            phones: args.phones || [],
            logoUrl: logoUrl,
            logoStorageId: args.logoStorageId,
            currentPeriodId: periodId,
            currentSemester: args.currentSemester,
            currentYear: args.currentYear,
        })

        await logAction(ctx, userId, "INITIALIZE_SCHOOL", "Initialized school configuration (First Run)")
    }
})

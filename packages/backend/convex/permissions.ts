import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { PERMISSION_DEFINITIONS, LEGACY_MAPPINGS, STAFF_DEFAULTS } from "./permissions_definitions";

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Clear existing definitions
        const existing = await ctx.db.query("permissionDefinitions").collect()
        for (const doc of existing) {
            await ctx.db.delete(doc._id)
        }

        // 2. Insert new definitions from Master List
        for (const def of PERMISSION_DEFINITIONS) {
            await ctx.db.insert("permissionDefinitions", {
                ...def,
                type: def.key.includes("*") ? "page" : "action"
            })
        }

        // 3. Migrate users using Master Mappings
        const masterKeys = PERMISSION_DEFINITIONS.map(d => d.key);
        const users = await ctx.db.query("users").collect();

        for (const user of users) {
            let currentCaps = [...(user.capabilities || [])];
            let updated = false;

            const beforeSize = currentCaps.length;

            if (user.role !== "Guardian") {
                // 1. Apply legacy mappings to non-admins
                for (const [legacyKey, newKeys] of Object.entries(LEGACY_MAPPINGS)) {
                    if (currentCaps.includes(legacyKey)) {
                        currentCaps = [...new Set([...currentCaps, ...newKeys])];
                    }
                }

                // 2. Add defaults
                currentCaps = [...new Set([...currentCaps, ...STAFF_DEFAULTS])];

                // 3. STRICT PURGE: Remove any key not in the Master List
                const purgedCaps = currentCaps.filter(cap => masterKeys.includes(cap));

                if (purgedCaps.length !== currentCaps.length) {
                    currentCaps = purgedCaps;
                }
            }

            if (currentCaps.length !== beforeSize || updated) {
                await ctx.db.patch(user._id, { capabilities: currentCaps });
            }
        }

        return { success: true, count: PERMISSION_DEFINITIONS.length }
    },
})

export const debugDefinitions = query({
    args: {},
    handler: async (ctx) => {
        const defs = await ctx.db.query("permissionDefinitions").collect();
        return defs.filter(d => d.module === "Discipline");
    },
});

export const getDefinitions = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const caps = user.capabilities || [];
        const hasAccess = caps.includes("access:system:permissions:manage") ||
            caps.includes("access:system:master-data:manage_roles");

        if (!hasAccess) {
            return { data: [], unauthorized: true };
        }
        const data = await ctx.db.query("permissionDefinitions").collect();
        return { data, unauthorized: false };
    },
});

export const wipeAllData = mutation({
    args: {},
    handler: async (ctx) => {
        // List of tables to clear
        const tables = [
            "users",
            "classes",
            "students",
            "studentHistory",
            "guardians",
            "assessments",
            "payments",
            "expenses",
            "otherFees",
            "feeStructures",
            "attendance",
            "disciplineIncidents",
            "books",
            "borrowRecords",
            "dormitories",
            "dormInventory",

            "timeSlots",
            "inventory",
            "inventoryAssignments",
            "payroll",
            "events",
            "messages",
            "channels",
            "notifications",
            "applicants",
            "subjects",
            "departments",
            "subjectAllocations",
            "auditLogs",
            "rateLimits",
            "permissionDefinitions",
        ];

        for (const table of tables) {
            // @ts-ignore
            const docs = await ctx.db.query(table).collect();
            for (const doc of docs) {
                await ctx.db.delete(doc._id);
            }
        }

        return { success: true, message: "All data wiped successfully" };
    },
});

export const cleanupStaleCapabilities = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const staleKeys = ["access:master-data", "master-data:manage", "attendance:manage"];
        let updatedCount = 0;

        for (const user of users) {
            const capabilities = user.capabilities || [];
            const newCapabilities = capabilities.filter(cap => !staleKeys.includes(cap));

            if (newCapabilities.length !== capabilities.length) {
                await ctx.db.patch(user._id, { capabilities: newCapabilities });
                updatedCount++;
            }
        }
        return { success: true, updatedCount };
    },
});

export const createDefaultAdmin = mutation({
    args: {},
    handler: async (ctx) => {
        const email = "system.admin@eduspark.com";
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();
        if (existing) return { success: true, userId: existing._id };

        const userId = await ctx.db.insert("users", {
            email,
            firstName: "System",
            lastName: "Admin",
            role: "SystemAdmin",
            capabilities: PERMISSION_DEFINITIONS.map(d => d.key),
            isActive: true,
            contact: "0000000000",
            gender: "Male",
            passwordHash: "password123",
            createdAt: Date.now(),
        });

        return { success: true, userId };
    },
});

// Force remove specific legacy keys that are causing UI glitches
export const forceCleanupLegacyPermissions = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const badKeys = [
            "access:master-data",
            "master-data:manage",
            "master-data:manage_fees",
            "access:allocations",
            "allocations:manage",
            "access:finance",
            "access:students",
            "access:admissions",
            "access:staff",
            "access:library",
            "access:inventory"
        ];
        let count = 0;

        for (const user of users) {
            if (!user.capabilities) continue;

            const newCaps = user.capabilities.filter((cap: string) => !badKeys.includes(cap));

            if (newCaps.length !== user.capabilities.length) {
                await ctx.db.patch(user._id, { capabilities: newCaps });
                count++;
            }
        }
        return { success: true, fixedUsers: count };
    }
});
// Wipe ALL capabilities from ALL users (Zero Defaults Reset)
export const resetAllUserCapabilities = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let count = 0;
        for (const user of users) {
            // Perform reset logic consistently for all users

            await ctx.db.patch(user._id, { capabilities: [] });
            count++;
        }
        return { success: true, resetUsers: count };
    }
});

export const cleanupBadAdmin = mutation({
    args: {},
    handler: async (ctx) => {
        const admin = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", "system.admin@eduspark.com"))
            .first();

        if (admin) {
            await ctx.db.delete(admin._id);
            return { success: true, deleted: true };
        }
        return { success: true, deleted: false };
    }
});



// Migrate old discipline permissions to new granular ones
export const migrateDisciplinePermissions = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const oldKeys = ["access:discipline", "discipline:manage"];
        const newKeys = ["discipline:my_incidents", "discipline:all_incidents", "discipline:actions", "discipline:analytics"];
        let count = 0;

        for (const user of users) {
            if (!user.capabilities) continue;

            // Check if user has old permissions
            const hasOld = user.capabilities.some(cap => oldKeys.includes(cap));
            if (hasOld) {
                // Remove old, add all new
                let newCaps = user.capabilities.filter(cap => !oldKeys.includes(cap));
                newCaps = [...new Set([...newCaps, ...newKeys])];
                await ctx.db.patch(user._id, { capabilities: newCaps });
                count++;
            }
        }
        return { success: true, migratedUsers: count };
    }
});

// Sync Parent Permissions for Secretary and DeputyHM (Decoupled version)
export const syncParentPermissions = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const targetRoles = ["Secretary", "DeputyHM"];
        let count = 0;

        for (const user of users) {
            if (targetRoles.includes(user.role)) {
                const currentCaps = user.capabilities || [];
                // Remove parents:manage if it's there (we want them to use admissions:enroll instead for enrollment flow)
                // BUT wait, DeputyHM might still need it for general parent management?
                // The user said "someone can be with admission page but not with parents page"
                // So for Secretary, we definitely remove it.

                let newCaps = currentCaps.filter(c => c !== "parents:manage");

                // Ensure they can complete enrollment flow
                if (!newCaps.includes("access:admissions:registry:manage")) {
                    newCaps.push("access:admissions:registry:manage");
                }

                if (newCaps.length !== currentCaps.length || !currentCaps.includes("access:admissions:registry:manage")) {
                    await ctx.db.patch(user._id, {
                        capabilities: newCaps
                    });
                    count++;
                }
            }
        }
        return { success: true, updatedUsers: count };
    }
});

// Final Cleanup: Remove "*" and sync SystemAdmin defaults
export const cleanupWildcardPermissions = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const adminDefaults = [
            "permissions:manage",
            "master-data:manage_classes",
            "master-data:manage_subjects",
            "master-data:manage_departments",
            "master-data:manage_fee_structures",
            "master-data:manage_other_fees",
            "master-data:manage_dormitories",
            "master-data:manage_roles",
            "access:payroll",
            "payroll:manage"
        ];
        let count = 0;

        for (const user of users) {
            let capabilities = user.capabilities || [];
            let changed = false;

            // Remove wildcard for everyone
            if (capabilities.includes("*")) {
                capabilities = capabilities.filter(c => c !== "*");
                changed = true;
            }

            // Removed explicit SystemAdmin default syncing
            // Permissions should be managed via the UI

            if (changed) {
                await ctx.db.patch(user._id, { capabilities });
                count++;
            }
        }
        return { success: true, modifiedUsers: count };
    }
});

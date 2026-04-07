import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUser, checkCapability, checkQueryAuth } from "./authHelpers";
import { PERMISSION_DEFINITIONS } from "./permissions_definitions";

export const getAll = query({
    args: { sessionId: v.optional(v.optional(v.string())) },
    handler: async (ctx, args) => {
        if (!args.sessionId) return [];
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];
        return await ctx.db.query("roles").collect();
    },
});

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:roles");
        if (!user) return { success: false, error: "You don't have permission to manage staff roles." };

        const existing = await ctx.db
            .query("roles")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();

        if (existing) {
            return { success: false, error: "A role with this name already exists. Please choose a different name." };
        }

        const roleId = await ctx.db.insert("roles", {
            name: args.name,
            description: args.description,
            createdAt: Date.now(),
        });

        return { success: true, roleId };
    },
});

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("roles"),
        name: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:roles");
        if (!user) return { success: false, error: "You don't have permission to update staff roles." };

        const { id, sessionId, ...rest } = args;
        await ctx.db.patch(id, rest);
        return { success: true };
    },
});

export const remove = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("roles")
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "manage:master-data:roles");
        if (!user) return { success: false, error: "You don't have permission to delete staff roles." };

        const role = await ctx.db.get(args.id);
        if (!role) {
            return { success: false, error: "We couldn't find the role you're trying to delete." };
        }

        // Check if any users are using this role
        const usersWithRole = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", role.name))
            .collect();

        if (usersWithRole.length > 0) {
            return { success: false, error: `This role is currently assigned to ${usersWithRole.length} staff member(s) and cannot be deleted.` };
        }

        await ctx.db.delete(args.id);
        return { success: true };
    },
});

export const seedEssentialRoles = mutation({
    args: { sessionId: v.optional(v.optional(v.string())) },
    handler: async (ctx, args): Promise<{ success: boolean; created?: number; updated?: number; error?: string }> => {
        // If roles exist, check for permission
        const roleCount: number = (await ctx.db.query("roles").collect()).length;
        if (roleCount > 0) {
            if (!args.sessionId) return { success: false, error: "You must be logged in to update existing roles." };
            const user: any = await checkCapability(ctx, args.sessionId, "manage:master-data:roles");
            if (!user) return { success: false, error: "You don't have permission to update essential roles." };
        }

        const essentialRoles = [
            { name: "SystemAdmin", description: "Full system access and configuration management" },
            { name: "ViceChancellor", description: "Overall University Head (VC/Rector)" },
            { name: "DeputyViceChancellor", description: "Deputy University Head (DVC)" },
            { name: "AcademicRegistrar", description: "Academic and Admissions Head" },
            { name: "UniversityBursar", description: "Chief Financial Officer / Head of Finance" },
            { name: "Accountant", description: "Finance Officer" },
            { name: "Dean", description: "Head of a Faculty or School" },
            { name: "Lecturer", description: "Academic Teaching Staff" },
            { name: "Librarian", description: "Library & Information Manager" },
            { name: "SupportStaff", description: "Administrative and General support" },
        ];

        let created: number = 0;
        let updated: number = 0;

        for (const role of essentialRoles) {
            const existing: any = await ctx.db.query("roles").withIndex("by_name", q => q.eq("name", role.name)).first();
            if (existing) {
                await ctx.db.patch(existing._id, {
                    description: role.description,
                });
                updated++;
            } else {
                await ctx.db.insert("roles", {
                    name: role.name,
                    description: role.description,
                    createdAt: Date.now(),
                });
                created++;
            }
        }

        return { success: true, created, updated };
    }
});

export const createSystemAdminRole = internalMutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("roles")
            .withIndex("by_name", (q) => q.eq("name", "SystemAdmin"))
            .first();
        if (existing) return existing._id;

        return await ctx.db.insert("roles", {
            name: "SystemAdmin",
            description: "Full system access and configuration management",
            createdAt: Date.now(),
        });
    },
});

export const createDefaultRoles = internalMutation({
    args: {},
    handler: async (ctx) => {
        const defaultRoles = [
            { name: "ViceChancellor", description: "Overall University Head" },
            { name: "DeputyViceChancellor", description: "Academic and Administrative Head" },
            { name: "AcademicRegistrar", description: "Director of Academic Affairs" },
            { name: "UniversityBursar", description: "Financial Administrator" },
            { name: "Lecturer", description: "Teaching & Research Staff" },
            { name: "Accountant", description: "Finance Support Staff" },
        ];

        for (const role of defaultRoles) {
            const existing = await ctx.db
                .query("roles")
                .withIndex("by_name", (q) => q.eq("name", role.name))
                .first();
            if (!existing) {
                await ctx.db.insert("roles", {
                    ...role,
                    createdAt: Date.now(),
                });
            }
        }
    },
});

export const getPermissionDefinitions = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId);
        if (unauthorized) return { data: [], unauthorized: true };
        return { data: PERMISSION_DEFINITIONS, unauthorized: false };
    },
});

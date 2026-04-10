import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAction } from "./audit_logger";
import { assertAdmin, assertAuthenticated } from "./lib/utils";

/**
 * Get all available system roles.
 */
export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return await ctx.db.query("systemRoles").collect();
  },
});

/**
 * Create a new custom role.
 */
export const createRole = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const existing = await ctx.db
      .query("systemRoles")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (existing) {
      throw new Error(`Role with code '${args.code}' already exists`);
    }

    const roleId = await ctx.db.insert("systemRoles", {
      name: args.name,
      code: args.code.toLowerCase().trim().replace(/\s+/g, "_"),
      description: args.description,
    });

    await logAction(ctx, {
      action: "CREATE_ROLE",
      resource: "systemRoles",
      details: `Created new dynamic role: ${args.name} (${args.code})`,
    });

    return roleId;
  },
});

/**
 * Update an existing role definition.
 */
export const updateRole = mutation({
  args: {
    id: v.id("systemRoles"),
    name: v.string(),
    code: v.optional(v.string()), // Allow renaming code
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new Error("Role not found");

    const oldCode = role.code;
    const newCode = args.code ? args.code.toLowerCase().trim().replace(/\s+/g, "_") : oldCode;

    // 1. Update the role record
    await ctx.db.patch(args.id, {
      name: args.name,
      code: newCode,
      description: args.description,
    });

    // 2. If code changed, cascade to staffProfiles
    if (newCode !== oldCode) {
      const staffWithOldRole = await ctx.db
        .query("staffProfiles")
        .collect(); // In production, use filters/indexes if possible, but here we scan and match

      for (const profile of staffWithOldRole) {
        if (profile.roles.includes(oldCode)) {
          const updatedRoles = profile.roles.map(r => r === oldCode ? newCode : r);
          await ctx.db.patch(profile._id, { roles: updatedRoles });
        }
      }
    }

    await logAction(ctx, {
      action: "UPDATE_ROLE",
      resource: "systemRoles",
      details: `Updated role: ${role.name}. New Code: ${newCode}. Cascaded changes to staff.`,
    });
  },
});

/**
 * Delete a role definition.
 */
export const deleteRole = mutation({
  args: { id: v.id("systemRoles") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new Error("Role not found");

    // Prevent deletion of protected roles (optional safety)
    if (["admin", "staff"].includes(role.code)) {
      throw new Error("System protected roles cannot be deleted");
    }

    await ctx.db.delete(args.id);

    await logAction(ctx, {
      action: "DELETE_ROLE",
      resource: "systemRoles",
      details: `Deleted role definition: ${role.name} (${role.code})`,
    });
  },
});

/**
 * Seed initial default roles if none exist.
 */
export const seedDefaultRoles = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const existing = await ctx.db.query("systemRoles").collect();
    if (existing.length > 0) return;

    const defaults = [
      { name: "Administrator", code: "admin", description: "Full system control" },
      { name: "Staff Member", code: "staff", description: "General university personnel" },
      { name: "Registrar", code: "registrar", description: "Academic records and admissions" },
      { name: "Finance Officer", code: "finance", description: "Financial operations and billing" },
      { name: "Head of Dept", code: "hod", description: "Departmental academic oversight" },
      { name: "Dean", code: "dean", description: "Faculty-level academic leadership" },
      { name: "Librarian", code: "librarian", description: "Library asset management" },
    ];

    for (const role of defaults) {
      await ctx.db.insert("systemRoles", role);
    }
  },
});

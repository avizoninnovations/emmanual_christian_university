import { v } from "convex/values";
import { query } from "./_generated/server";
import { mutation } from "./lib/mutations";
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
 * Roles whose deletion is forbidden because they are referenced
 * by built-in `assertRole(...)` calls across the codebase or are
 * structurally required by the system.
 */
export const PROTECTED_ROLE_CODES = [
  "admin",
  "staff",
  "registrar",
  "finance",
  "bursar",
  "cashier",
  "hod",
  "dean",
  "lecturer",
  "librarian",
];

/**
 * Delete a role definition.
 */
export const deleteRole = mutation({
  args: { id: v.id("systemRoles") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const role = await ctx.db.get(args.id);
    if (!role) throw new Error("Role not found");

    // Prevent deletion of protected roles (referenced by assertRole calls)
    if (PROTECTED_ROLE_CODES.includes(role.code)) {
      throw new Error(
        `Role '${role.code}' is protected and cannot be deleted because it is referenced by system permission checks.`
      );
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
 * ECU default role catalog.
 *
 * Tiers:
 *   1. System & University Leadership — full visibility, governance
 *   2. Academic Leadership — faculty/department oversight
 *   3. Finance — money movement, reconciliation, bursary
 *   4. Academic Staff — teaching, assessment, course allocation
 *   5. Support Staff — welfare, library, chaplaincy, IT, HR
 *
 * IMPORTANT: any role code listed in `PROTECTED_ROLE_CODES` above must
 * also exist in the defaults below, otherwise the deletion guard will
 * reject removals that the codebase still depends on.
 */
export const ECU_DEFAULT_ROLES: Array<{
  name: string;
  code: string;
  description: string;
  tier: 1 | 2 | 3 | 4 | 5;
  category: "leadership" | "academic" | "finance" | "support" | "system";
}> = [
  // ─── Tier 1: System & University Leadership ───────────────────────
  {
    name: "System Administrator",
    code: "admin",
    description:
      "Full system control. Manages roles, staff, audit logs, settings, and all sensitive mutations.",
    tier: 1,
    category: "system",
  },
  {
    name: "Vice-Chancellor",
    code: "vice_chancellor",
    description:
      "Top academic and executive officer of the university. Strategic oversight, final approvals, governance reporting.",
    tier: 1,
    category: "leadership",
  },
  {
    name: "Deputy Vice-Chancellor",
    code: "deputy_vc",
    description:
      "Second-in-command. Deputises for the VC and oversees academic affairs or administration as assigned.",
    tier: 1,
    category: "leadership",
  },

  // ─── Tier 2: Academic Leadership ──────────────────────────────────
  {
    name: "Dean",
    code: "dean",
    description:
      "Faculty-level academic leadership. Oversees departments, approves broadsheet/marks for the faculty.",
    tier: 2,
    category: "academic",
  },
  {
    name: "Head of Department",
    code: "hod",
    description:
      "Departmental academic oversight. Approves marks, manages course allocations, supervises lecturers.",
    tier: 2,
    category: "academic",
  },
  {
    name: "Academic Registrar",
    code: "registrar",
    description:
      "Admissions pipeline, student records, enrollment, transcripts, academic standing.",
    tier: 2,
    category: "academic",
  },
  {
    name: "Admissions Officer",
    code: "admissions_officer",
    description:
      "Day-to-day admissions operations. Verifies documents, schedules interviews, supports the Registrar.",
    tier: 2,
    category: "academic",
  },
  {
    name: "Examinations Officer",
    code: "examinations_officer",
    description:
      "Coordinates exams, manages marks workflow, broadasheets, supplementary exams, and exam-card clearance.",
    tier: 2,
    category: "academic",
  },

  // ─── Tier 3: Finance ──────────────────────────────────────────────
  {
    name: "Bursar",
    code: "bursar",
    description:
      "Chief finance officer. Approves waivers/scholarships, signs off on large transactions, owns financial reporting.",
    tier: 3,
    category: "finance",
  },
  {
    name: "Finance Officer",
    code: "finance",
    description:
      "Financial operations: fee structures, invoicing, sponsors, reports. Full access to finance module.",
    tier: 3,
    category: "finance",
  },
  {
    name: "Cashier",
    code: "cashier",
    description:
      "Records payments, prints receipts, runs end-of-day reconciliation. Scoped to transaction entry.",
    tier: 3,
    category: "finance",
  },

  // ─── Tier 4: Academic Staff ───────────────────────────────────────
  {
    name: "Senior Lecturer",
    code: "senior_lecturer",
    description:
      "Experienced teaching staff. May coordinate courses and mentor junior lecturers.",
    tier: 4,
    category: "academic",
  },
  {
    name: "Lecturer",
    code: "lecturer",
    description:
      "Teaching staff. Enters attendance, submits marks, accesses allocated courses.",
    tier: 4,
    category: "academic",
  },

  // ─── Tier 5: Support Staff ────────────────────────────────────────
  {
    name: "Librarian",
    code: "librarian",
    description:
      "Library operations: cataloguing, loans, returns, reservations, e-resource management.",
    tier: 5,
    category: "support",
  },
  {
    name: "Dean of Students",
    code: "dean_of_students",
    description:
      "Student welfare, discipline, accommodation oversight, pastoral care coordination.",
    tier: 5,
    category: "support",
  },
  {
    name: "Chaplain",
    code: "chaplain",
    description:
      "Spiritual formation and chapel services. Coordinates faith-based programmes across the university community.",
    tier: 5,
    category: "support",
  },
  {
    name: "ICT Officer",
    code: "ict_officer",
    description:
      "IT support, system access issues, hardware/software inventory, user onboarding.",
    tier: 5,
    category: "support",
  },
  {
    name: "Human Resources Officer",
    code: "hr_officer",
    description:
      "Staff records, leave, payroll inputs, performance management coordination.",
    tier: 5,
    category: "support",
  },
  {
    name: "Staff Member",
    code: "staff",
    description:
      "Generic staff role. Default catch-all for university personnel without a specific operational duty.",
    tier: 5,
    category: "support",
  },
];

/**
 * Seed initial default roles if none exist.
 *
 * If you ever need to add new system roles for ECU, add them to
 * `ECU_DEFAULT_ROLES` above (and to `PROTECTED_ROLE_CODES` if they are
 * referenced by built-in `assertRole(...)` calls), then re-run this seed
 * after clearing the `systemRoles` table.
 */
export const seedDefaultRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("systemRoles").collect();
    if (existing.length > 0) return;

    for (const role of ECU_DEFAULT_ROLES) {
      await ctx.db.insert("systemRoles", {
        name: role.name,
        code: role.code,
        description: role.description,
        tier: role.tier,
        category: role.category,
        isProtected: PROTECTED_ROLE_CODES.includes(role.code),
      });
    }

    await logAction(ctx, {
      action: "SEED_DEFAULT_ROLES",
      resource: "systemRoles",
      details: `Seeded ${ECU_DEFAULT_ROLES.length} default ECU roles (${PROTECTED_ROLE_CODES.length} protected).`,
    });
  },
});

//  Emergency Contacts Module
// Student emergency contact management

import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, checkAnyCapability } from "./authHelpers";

// ===== GET ALL CONTACTS =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const caps = user.capabilities || [];
        const hasAccess = caps.includes("access:emergency_contacts") ||
            caps.includes("access:students");

        if (!hasAccess) {
            return { data: [], unauthorized: true };
        }

        const data = await ctx.db.query("emergencyContacts").collect();
        return { data, unauthorized: false };
    },
});

export const getByUserId = query({
    args: {
        sessionId: v.optional(v.string()),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        // Allow if requesting own data OR has the access:emergency_contacts capability
        if (user._id !== args.userId) {
            const hasCap = await checkCapability(ctx, args.sessionId, "access:emergency_contacts");
            if (!hasCap) return { data: null, unauthorized: true };
        }

        const contact = await ctx.db
            .query("emergencyContacts")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!contact) return { data: null, unauthorized: false };

        const students = await ctx.db
            .query("students")
            .withIndex("by_emergency_contact", (q) => q.eq("emergencyContactId", contact._id))
            .collect();

        const enrichedStudents = await Promise.all(students.map(async (s) => {
            const programDoc = s.programId ? await ctx.db.get(s.programId) : null;
            return {
                ...s,
                name: s.fullName || `${s.firstName} ${s.lastName}`,
                programName: programDoc ? programDoc.name : "Unassigned",
                studentId: s.studentNumber || s.registrationNumber || "-"
            };
        }));

        const data = {
            ...contact,
            students: enrichedStudents,
        };
        return { data, unauthorized: false };
    },
});

// ===== GET BY ID =====

export const getById = query({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("emergencyContacts"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { data: null, unauthorized: true };

        const contact = await ctx.db.get(args.id);
        if (!contact) {
            return { data: null, unauthorized: false };
        }

        const students = await ctx.db
            .query("students")
            .withIndex("by_emergency_contact", (q) => q.eq("emergencyContactId", args.id))
            .collect();

        const enrichedStudents = await Promise.all(students.map(async (s) => {
            const programDoc = s.programId ? await ctx.db.get(s.programId) : null;
            return {
                ...s,
                name: s.fullName || `${s.firstName} ${s.lastName}`,
                programName: programDoc ? programDoc.name : "Unassigned",
                studentId: s.studentNumber || s.registrationNumber || "-"
            };
        }));

        const data = {
            ...contact,
            students: enrichedStudents,
        };
        return { data, unauthorized: false };
    },
});

// ===== CREATE CONTACT =====

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(),
        contact: v.string(),
        email: v.optional(v.string()),
        relationship: v.string(),
        occupation: v.optional(v.string()),
        address: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        // User creation args (Now effectively mandatory)
        createAccount: v.optional(v.boolean()),
        passwordHash: v.optional(v.string()),
        emailForLogin: v.optional(v.string()),
        studentIds: v.optional(v.array(v.id("students"))),
    },
    handler: async (ctx, args) => {
        const user = await checkAnyCapability(ctx, args.sessionId, ["access:emergency_contacts", "access:admissions:registry:manage", "admissions:enroll"]);
        if (!user) return { success: false, error: "You don't have permission to manage contact records." };

        const { sessionId, createAccount, passwordHash, emailForLogin, studentIds, ...contactData } = args;

        let userId: Id<"users"> | undefined = undefined;

        // Force createAccount to true if not provided
        const shouldCreateAccount = createAccount !== false;

        if (shouldCreateAccount) {
            if (!emailForLogin || !passwordHash) {
                return { success: false, error: "Please provide an email and password to create the account." };
            }

            const existingUser = await ctx.db
                .query("users")
                .withIndex("by_email", q => q.eq("email", emailForLogin))
                .first();

            if (existingUser) return { success: false, error: `A user with the email ${emailForLogin} already exists.` };

            const firstName = contactData.name.split(" ")[0] || "Contact";
            const lastName = contactData.name.split(" ").slice(1).join(" ") || "Unknown";

            userId = await ctx.db.insert("users", {
                email: emailForLogin,
                passwordHash: passwordHash,
                firstName,
                lastName,
                role: "Guardian",
                isActive: true,
                createdAt: Date.now(),
                contact: contactData.contact,
                capabilities: ["access:student_data", "access:finance_data"],
            });
        }

        if (contactData.email) {
            const existingContact = await ctx.db
                .query("emergencyContacts")
                .withIndex("by_user", q => q.eq("userId", userId)) // Fallback, email index not present on emergencyContacts
                .first();
            // Note: Since we don't have a unique email index on emergencyContacts yet, we just check by userId if it exists
        }

        const emergencyContactId = await ctx.db.insert("emergencyContacts", {
            ...contactData,
            userId: userId,
        });

        // Link students if provided
        if (studentIds && studentIds.length > 0) {
            for (const sId of studentIds) {
                await ctx.db.patch(sId, { emergencyContactId });
            }
        }

        await logAction(ctx, user._id, "CREATE_EMERGENCY_CONTACT", `Created: ${contactData.name}`);

        return { success: true, emergencyContactId };
    },
});

export const createContactAction = action({
    args: {
        sessionId: v.optional(v.string()),
        name: v.string(),
        contact: v.string(),
        email: v.optional(v.string()),
        relationship: v.string(),
        occupation: v.optional(v.string()),
        address: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        createAccount: v.optional(v.boolean()),
        password: v.optional(v.string()), // Plain text
        emailForLogin: v.optional(v.string()),
        studentIds: v.optional(v.array(v.id("students"))),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string; emergencyContactId?: Id<"emergencyContacts"> }> => {
        let passwordHash: string | undefined = undefined;

        const shouldCreateAccount = args.createAccount !== false;

        if (shouldCreateAccount) {
            const passwordToHash = args.password || "changeme123";
            passwordHash = await ctx.runAction(internal.authActions.hashPasswordAction, {
                password: passwordToHash
            });
        }

        const { password, ...mutationArgs } = args;

        return await ctx.runMutation(api.emergencyContacts.create, {
            ...mutationArgs,
            createAccount: shouldCreateAccount,
            passwordHash,
        });
    }
});

// ===== RETROACTIVE ACCOUNT CREATION =====
// (Kept for compatibility, updated references)

export const createMissingAccountsMutation = internalMutation({
    args: {
        accounts: v.array(v.object({
            contactId: v.id("emergencyContacts"),
            email: v.string(),
            passwordHash: v.string(),
            firstName: v.string(),
            lastName: v.string(),
            contact: v.string(),
        }))
    },
    handler: async (ctx: any, args: any) => {
        for (const account of args.accounts) {
            const userId = await ctx.db.insert("users", {
                email: account.email,
                passwordHash: account.passwordHash,
                firstName: account.firstName,
                lastName: account.lastName,
                role: "Guardian",
                isActive: true,
                createdAt: Date.now(),
                contact: account.contact,
                capabilities: ["access:student_data", "access:finance_data"],
            });

            await ctx.db.patch(account.contactId, { userId });
        }
    }
});

// (Skipping retroactive action for now as it needs careful index matching)

// ===== UPDATE CONTACT =====

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("emergencyContacts"),
        name: v.optional(v.string()),
        contact: v.optional(v.string()),
        email: v.optional(v.string()),
        relationship: v.optional(v.string()),
        occupation: v.optional(v.string()),
        address: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        studentIds: v.optional(v.array(v.id("students"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:emergency_contacts"); // Potential key update
        if (!user) return { success: false, error: "You don't have permission to update contact information." };

        const { sessionId, id, studentIds, ...updates } = args;

        await ctx.db.patch(id, updates);

        // Handled linked students
        if (studentIds !== undefined) {
            const currentStudents = await ctx.db
                .query("students")
                .withIndex("by_emergency_contact", q => q.eq("emergencyContactId", id))
                .collect();

            const currentStudentIds = currentStudents.map(s => s._id);
            const toUnlink = currentStudentIds.filter(sId => !studentIds.includes(sId));
            const toLink = studentIds.filter(sId => !currentStudentIds.includes(sId));

            for (const sId of toUnlink) {
                await ctx.db.patch(sId, { emergencyContactId: undefined });
            }
            for (const sId of toLink) {
                await ctx.db.patch(sId, { emergencyContactId: id });
            }
        }

        await logAction(ctx, user._id, "UPDATE_EMERGENCY_CONTACT", `Updated: ${id}`);

        return { success: true };
    },
});

// ===== DELETE CONTACT =====

export const deleteContact = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("emergencyContacts"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:emergency_contacts");
        if (!user) return { success: false, error: "You don't have permission to delete contact records." };

        const students = await ctx.db
            .query("students")
            .withIndex("by_emergency_contact", (q) => q.eq("emergencyContactId", args.id))
            .collect();

        if (students.length > 0) {
            return { success: false, error: `You can't delete this contact because they are still linked to ${students.length} students.` };
        }

        await ctx.db.delete(args.id);

        await logAction(ctx, user._id, "DELETE_EMERGENCY_CONTACT", `Deleted: ${args.id}`);

        return { success: true };
    },
});

export const unlinkStudent = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:emergency_contacts");
        if (!user) return { success: false, error: "You don't have permission to change student-contact links." };

        await ctx.db.patch(args.studentId, { emergencyContactId: undefined });
        return { success: true };
    },
});

// ===== SEARCH CONTACTS =====

export const search = query({
    args: {
        sessionId: v.optional(v.string()),
        searchTerm: v.string(),
        paginationOpts: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        const contacts = args.searchTerm.trim().length > 0
            ? await ctx.db
                .query("emergencyContacts")
                .withSearchIndex("search_contacts", (q) =>
                    q.search("name", args.searchTerm)
                )
                .paginate(args.paginationOpts)
            : await ctx.db
                .query("emergencyContacts")
                .paginate(args.paginationOpts);

        return { ...contacts, unauthorized: false };
    },
});

// ===== LIST PAGINATED =====

export const list = query({
    args: {
        sessionId: v.optional(v.string()),
        paginationOpts: v.any(),
        searchTerm: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        let contacts;
        if (args.searchTerm && args.searchTerm.trim()) {
            contacts = await ctx.db
                .query("emergencyContacts")
                .withSearchIndex("search_contacts", (q) =>
                    q.search("name", args.searchTerm!)
                )
                .paginate(args.paginationOpts);
        } else {
            contacts = await ctx.db
                .query("emergencyContacts")
                .order("desc")
                .paginate(args.paginationOpts);
        }

        return { ...contacts, unauthorized: false };
    },
});

// ===== ANALYTICS =====

export const getAnalytics = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:emergency_contacts");
        if (!user) return { stats: null, unauthorized: true };

        const allContacts = await ctx.db.query("emergencyContacts").collect();
        
        const stats = {
            total: allContacts.length,
            byRelationship: {} as Record<string, number>,
        };

        for (const g of allContacts) {
            stats.byRelationship[g.relationship] = (stats.byRelationship[g.relationship] || 0) + 1;
        }

        return { stats, unauthorized: false };
    }
});

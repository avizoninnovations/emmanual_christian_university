import { mutation, query, action } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUser, logAction, checkCapability, checkQueryAuth } from "./authHelpers";

// Get counts of applicants by stage for analytics
export const getStageCounts = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:admissions");
        if (unauthorized) return { data: null, unauthorized: true };

        const semester = args.semester;
        const year = args.year;

        let applicants;
        if (args.semester !== undefined && args.year !== undefined) {
             applicants = await ctx.db.query("applicants")
                .withIndex("by_period", (q) => q.eq("semester", args.semester!).eq("year", args.year!))
                .collect();
        } else {
            applicants = await ctx.db.query("applicants").collect();
        }

        const counts = {
            New: 0,
            Interview: 0,
            Admitted: 0,
            Enrolled: 0,
            Rejected: 0,
            total: applicants.length
        };

        applicants.forEach(app => {
            if (app.stage in counts) {
                counts[app.stage as keyof typeof counts]++;
            }
        });

        return { data: counts, unauthorized: false };
    }
});

// Get all applicants
export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        stage: v.optional(v.string()),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:admissions");
        if (unauthorized) return { data: [], unauthorized: true };

        const applicantsQuery = (args.semester !== undefined && args.year !== undefined)
            ? ctx.db.query("applicants").withIndex("by_period", (q) =>
                q.eq("semester", args.semester!).eq("year", args.year!)
            )
            : args.stage
                ? ctx.db.query("applicants").withIndex("by_stage", q => q.eq("stage", args.stage as any))
                : ctx.db.query("applicants");

        let applicants = await applicantsQuery.order("desc").collect();

        return { data: applicants, unauthorized: false };
    },
});

// Get a single applicant by ID
export const getById = query({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("applicants"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return null;
        const applicant = await ctx.db.get(args.id);
        if (!applicant) return null;
        return applicant;
    },
});

// Paginated applicants query with dynamic filtering
export const getApplicantsPaginated = query({
    args: {
        sessionId: v.optional(v.string()),
        stage: v.optional(v.string()),
        targetProgramId: v.optional(v.id("programs")),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
        search: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:admissions");
        if (unauthorized) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        let q;
        if (args.search && args.search.trim().length > 0) {
            q = ctx.db
                .query("applicants")
                .withSearchIndex("search_name", (q) => {
                    let search = q.search("applicantName", args.search!);
                    if (args.stage && args.stage !== "All") search = search.eq("stage", args.stage as any);
                    if (args.targetProgramId) search = search.eq("targetProgramId", args.targetProgramId);
                    if (args.semester) search = search.eq("semester", args.semester);
                    if (args.year) search = search.eq("year", args.year);
                    return search;
                });
        } else if (args.stage && args.stage !== "All" && args.semester && args.year) {
            q = ctx.db.query("applicants").withIndex("by_stage_period", q => q.eq("stage", args.stage as any).eq("semester", args.semester!).eq("year", args.year!));
        } else if (args.semester && args.year) {
            q = ctx.db.query("applicants").withIndex("by_period", q => q.eq("semester", args.semester!).eq("year", args.year!));
        } else if (args.stage && args.stage !== "All") {
            q = ctx.db.query("applicants").withIndex("by_stage", q => q.eq("stage", args.stage as any));
        } else {
            q = ctx.db.query("applicants").order("desc");
        }

        if (args.targetProgramId && !args.search) {
            q = q.filter(qb => qb.eq(qb.field("targetProgramId"), args.targetProgramId));
        }

        const result = await q.paginate(args.paginationOpts);

        return { ...result, unauthorized: false };
    }
});

// Helper for total count
export const getTotalCount = query({
    args: {
        sessionId: v.optional(v.string()),
        stage: v.optional(v.string()),
        targetProgramId: v.optional(v.id("programs")),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:admissions");
        if (unauthorized) return { data: 0, unauthorized: true };

        let q;
        if (args.search && args.search.trim().length > 0) {
            q = ctx.db
                .query("applicants")
                .withSearchIndex("search_name", (q) => {
                    let s = q.search("applicantName", args.search!);
                    if (args.stage && args.stage !== "All") s = s.eq("stage", args.stage as any);
                    if (args.targetProgramId) s = s.eq("targetProgramId", args.targetProgramId);
                    if (args.semester) s = s.eq("semester", args.semester);
                    if (args.year) s = s.eq("year", args.year);
                    return s;
                });
        } else if (args.stage && args.stage !== "All" && args.semester && args.year) {
            q = ctx.db.query("applicants").withIndex("by_stage_period", q => q.eq("stage", args.stage as any).eq("semester", args.semester!).eq("year", args.year!));
        } else if (args.semester && args.year) {
            q = ctx.db.query("applicants").withIndex("by_period", q => q.eq("semester", args.semester!).eq("year", args.year!));
        } else if (args.stage && args.stage !== "All") {
            q = ctx.db.query("applicants").withIndex("by_stage", q => q.eq("stage", args.stage as any));
        } else {
            q = ctx.db.query("applicants");
        }

        if (args.targetProgramId && !args.search) {
            q = q.filter(qb => qb.eq(qb.field("targetProgramId"), args.targetProgramId));
        }

        const results = await q.collect();
        return { data: results.length, unauthorized: false };
    }
});

// Create a new applicant
export const createApplicant = mutation({
    args: {
        sessionId: v.optional(v.string()), 
        applicantName: v.string(),
        contact: v.string(),
        targetProgramId: v.id("programs"),
        gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
        dateOfBirth: v.optional(v.string()),
        notes: v.optional(v.string()),
        priorEducation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registration:manage");
        if (!user) return { success: false, error: "You don't have permission to register new applicants." };

        const config = await ctx.db.query("schoolConfig").first();
        const currentSemester = config?.currentSemester || 1;
        const currentYear = config?.currentYear || new Date().getFullYear();

        const applicantId = await ctx.db.insert("applicants", {
            applicantName: args.applicantName,
            contact: args.contact,
            targetProgramId: args.targetProgramId,
            gender: args.gender,
            dateOfBirth: args.dateOfBirth,
            stage: "New",
            dateApplied: new Date().toISOString().split('T')[0],
            notes: args.notes,
            semester: currentSemester,
            year: currentYear,
            priorEducation: args.priorEducation,
        });

        await logAction(ctx, user._id, "CREATE_APPLICANT", `Created applicant: ${args.applicantName}`);

        return { success: true, applicantId };
    },
});

// Update an existing applicant
export const updateApplicant = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("applicants"),
        applicantName: v.optional(v.string()),
        contact: v.optional(v.string()),
        targetProgramId: v.optional(v.id("programs")),
        gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
        dateOfBirth: v.optional(v.string()),
        notes: v.optional(v.string()),
        stage: v.optional(v.union(v.literal("New"), v.literal("Interview"), v.literal("Admitted"), v.literal("Rejected"), v.literal("Enrolled"))),
        priorEducation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registry:manage");
        if (!user) return { success: false, error: "You don't have permission to update applicant details." };

        const { sessionId, id, ...updates } = args;

        await ctx.db.patch(id, updates);

        await logAction(ctx, user._id, "UPDATE_APPLICANT", `Updated applicant: ${id}`);
        return { success: true };
    },
});

// Delete an applicant
export const deleteApplicant = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("applicants"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registry:manage");
        if (!user) return { success: false, error: "You don't have permission to delete applicants." };

        const data = await ctx.db.get(args.id);
        if (!data) return;

        await ctx.db.delete(args.id);

        await logAction(ctx, user._id, "DELETE_APPLICANT", `Deleted applicant: ${args.id}`);
        return { success: true };
    },
});

export const bulkDeleteApplicants = mutation({
    args: {
        sessionId: v.optional(v.string()),
        ids: v.array(v.id("applicants")),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registry:manage");
        if (!user) return { success: false, error: "You don't have permission to delete multiple applicants." };

        await Promise.all(args.ids.map(id => ctx.db.delete(id)));

        await logAction(ctx, user._id, "BULK_DELETE_APPLICANTS", `Deleted ${args.ids.length} applicants`);
    },
});

export const bulkUpdateApplicantStage = mutation({
    args: {
        sessionId: v.optional(v.string()),
        ids: v.array(v.id("applicants")),
        stage: v.union(v.literal("New"), v.literal("Interview"), v.literal("Admitted"), v.literal("Rejected"), v.literal("Enrolled")),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registry:manage");
        if (!user) return { success: false, error: "You don't have permission to change applicant stages." };

        await Promise.all(args.ids.map(id => ctx.db.patch(id, { stage: args.stage })));

        await logAction(ctx, user._id, "BULK_UPDATE_STAGE", `Updated ${args.ids.length} applicants to ${args.stage}`);
    },
});

// Action to handle hashing and calling the internal mutation
export const enrollApplicant = action({
    args: {
        sessionId: v.optional(v.string()),
        applicantId: v.id("applicants"),
        programId: v.id("programs"),
        contactData: v.object({
            existingContactId: v.optional(v.id("emergencyContacts")),
            newContact: v.optional(v.object({
                name: v.string(),
                relationship: v.string(),
                contact: v.string(),
                email: v.optional(v.string()),
                createAccount: v.boolean(),
                password: v.optional(v.string()),
                emailForLogin: v.optional(v.string()),
            })),
        }),
    },
    handler: async (ctx, args): Promise<any> => {
        await ctx.runQuery(internal.authQueries.checkCapabilityInternal, {
            sessionId: args.sessionId,
            requiredCapability: "access:admissions:registry:manage"
        });
        let passwordHash: string | undefined;

        const newContact = args.contactData.newContact;
        if (newContact) {
            const passwordToHash = newContact.password || "changeme123";
            passwordHash = await ctx.runAction(internal.authActions.hashPasswordAction, {
                password: passwordToHash
            });
        }

        // Call internal mutation
        return await ctx.runMutation(internal.enrollment.enrollApplicantInternal, {
            sessionId: args.sessionId,
            applicantId: args.applicantId,
            programId: args.programId,
            contactData: {
                existingContactId: args.contactData.existingContactId,
                newContact: newContact ? {
                    name: newContact.name,
                    relationship: newContact.relationship,
                    contact: newContact.contact,
                    email: newContact.email,
                    createAccount: true,
                    emailForLogin: newContact.emailForLogin || newContact.email,
                    passwordHash,
                } : undefined
            }
        });
    }
});


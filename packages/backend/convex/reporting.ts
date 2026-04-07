//  Reporting Module (Messages, Admissions)
// Session-based auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { paginationOptsValidator } from "convex/server";

// ===== MESSAGES ===== //

export const getMessages = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];

        return await ctx.db
            .query("messages")
            .withIndex("by_sender", (q) => q.eq("senderId", user._id))
            .collect();
    },
});

export const sendMessage = mutation({
    args: {
        sessionId: v.optional(v.string()),
        subject: v.optional(v.string()),
        content: v.string(),
        recipients: v.string(), // e.g., "All Parents", "P1 Parents"
        type: v.union(v.literal("SMS"), v.literal("Email")),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { success: false, error: "You don't have permission to send messages." };

        const config = await ctx.db.query("schoolConfig").first();
        const semester = config?.currentSemester || 1;
        const year = config?.currentYear || new Date().getFullYear();

        const messageId = await ctx.db.insert("messages", {
            subject: args.subject,
            content: args.content,
            recipients: args.recipients,
            type: args.type,
            status: "Pending", // Will be processed by a cron/action
            date: new Date().toISOString(),
            senderId: user._id,
            semester,
            year,
        });

        await logAction(ctx, user._id, "SEND_MESSAGE", `Type: ${args.type}`);

        return messageId;
    },
});

// ===== ADMISSIONS =====

export const getApplicants = query({
    args: {
        sessionId: v.optional(v.string()),
        stage: v.optional(v.string()),
        targetProgramId: v.optional(v.id("programs")),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
        searchTerm: v.optional(v.string()), // New: Support for server-side search
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions");
        if (!user) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
                unauthorized: true
            };
        }

        let q;

        // 1. Prioritize Search Index if searchTerm is provided
        if (args.searchTerm) {
            let searchQ = ctx.db
                .query("applicants")
                .withSearchIndex("search_name", (q) => {
                    let search = q.search("applicantName", args.searchTerm!);
                    if (args.stage && args.stage !== 'All') search = search.eq("stage", args.stage as any);
                    if (args.targetProgramId) search = search.eq("targetProgramId", args.targetProgramId);
                    if (args.semester) search = search.eq("semester", args.semester);
                    if (args.year) search = search.eq("year", args.year);
                    return search;
                });
            return await searchQ.paginate(args.paginationOpts);
        }

        // 2. Fallback to Composite/Specific Indexes
        if (args.stage && args.stage !== 'All' && args.semester && args.year) {
            // Optimized: Use new by_stage_period index
            q = ctx.db
                .query("applicants")
                .withIndex("by_stage_period", (q) =>
                    q.eq("stage", args.stage as any).eq("semester", args.semester!).eq("year", args.year!)
                );
        } else if (args.semester && args.year) {
            q = ctx.db
                .query("applicants")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester!).eq("year", args.year!)
                );
        } else if (args.targetProgramId) {
            q = ctx.db
                .query("applicants")
                .withIndex("by_targetProgram", (q) => q.eq("targetProgramId", args.targetProgramId!));
        } else {
            q = ctx.db.query("applicants").order("desc");
        }

        return await q.paginate(args.paginationOpts as any);
    },
});

export const updateApplicantStage = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("applicants"),
        stage: v.union(
            v.literal("New"),
            v.literal("Interview"),
            v.literal("Admitted"),
            v.literal("Rejected"),
            v.literal("Enrolled")
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions:registry:manage");
        if (!user) return { success: false, error: "You don't have permission to update applicant information." };



        await ctx.db.patch(args.id, {
            stage: args.stage,
            notes: args.notes,
        });

        await logAction(
            ctx,
            user._id,
            "UPDATE_APPLICANT",
            `ID: ${args.id}, Stage: ${args.stage}`
        );

        return { success: true };
    },
});

export const getAdmissionsStats = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:admissions");
        if (!user) return { total: 0, byStage: {}, byClass: [], unauthorized: true };

        // Live query: use index for filtered periods, full scan for global
        const applicants = (args.semester && args.year)
            ? await ctx.db
                .query("applicants")
                .withIndex("by_period", (q) => q.eq("semester", args.semester!).eq("year", args.year!))
                .collect()
            : await ctx.db.query("applicants").collect();

        const total = applicants.length;
        const byStage = { New: 0, Interview: 0, Admitted: 0, Enrolled: 0, Rejected: 0 };
        const byProgram: Record<string, number> = {};

        for (const app of applicants) {
            if (byStage[app.stage as keyof typeof byStage] !== undefined) {
                byStage[app.stage as keyof typeof byStage]++;
            }
            const programId = app.targetProgramId;
            byProgram[programId] = (byProgram[programId] || 0) + 1;
        }

        return {
            total,
            byStage,
            byProgram: Object.entries(byProgram)
                .map(([programId, count]) => ({ programId, count }))
                .sort((a, b) => b.count - a.count),
        };
    },
});

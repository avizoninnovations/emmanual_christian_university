// Assessment Configuration Module (University Grade)
// Manages course-level assessment weightings and deadlines

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// ===== GET CONFIG FOR COURSE =====

export const getForCourse = query({
    args: {
        sessionId: v.optional(v.string()),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number(),
        lecturerId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return null;

        const lecturerId = args.lecturerId || user._id;

        return await ctx.db
            .query("assessmentConfigs")
            .withIndex("by_lecturer_course", (q) =>
                q.eq("lecturerId", lecturerId)
                    .eq("courseId", args.courseId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .first();
    },
});

// ===== UPSERT CONFIG =====

export const upsert = mutation({
    args: {
        sessionId: v.optional(v.string()),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number(),
        columns: v.array(v.object({
            id: v.string(),
            label: v.string(),
            maxMarks: v.number(),
            weight: v.number(),
            includeInFinal: v.boolean(),
            deadline: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { success: false, error: "Unauthorized" };

        const existing = await ctx.db
            .query("assessmentConfigs")
            .withIndex("by_lecturer_course", (q) =>
                q.eq("lecturerId", user._id)
                    .eq("courseId", args.courseId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .first();

        const configData = {
            lecturerId: user._id,
            courseId: args.courseId,
            semester: args.semester,
            year: args.year,
            columns: args.columns,
            status: "Active" as const,
        };

        let configId;
        if (existing) {
            // Locked check could go here if status === "Locked"
            if (existing.status === "Locked") {
                return { success: false, error: "This assessment structure is locked and cannot be modified." };
            }
            await ctx.db.patch(existing._id, { columns: args.columns });
            configId = existing._id;
        } else {
            configId = await ctx.db.insert("assessmentConfigs", configData);
        }

        await logAction(
            ctx,
            user._id,
            "CONFIGURE_ASSESSMENT",
            `Course: ${args.courseId}, Columns: ${args.columns.length}`
        );

        return { success: true, configId };
    },
});

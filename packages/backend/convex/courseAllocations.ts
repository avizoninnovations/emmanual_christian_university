//  Course Allocations (Replaces Subject Allocations)
// Session-based auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, userHasCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// ===== GET ALLOCATIONS =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        lecturerId: v.optional(v.id("users")),
        programId: v.optional(v.id("programs")),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:allocations:courses");
        if (!user) return { data: [], unauthorized: true };

        let data;
        if (args.lecturerId) {
            data = await ctx.db
                .query("courseAllocations")
                .withIndex("by_lecturer_period", (q) => q.eq("lecturerId", args.lecturerId!).eq("year", args.year).eq("semester", args.semester))
                .collect();
        } else if (args.programId) {
            data = await ctx.db
                .query("courseAllocations")
                .withIndex("by_program_period", (q) => q.eq("programId", args.programId!).eq("year", args.year).eq("semester", args.semester))
                .collect();
        } else {
            data = await ctx.db
                .query("courseAllocations")
                .withIndex("by_period", (q) =>
                    q.eq("year", args.year).eq("semester", args.semester)
                )
                .collect();
        }

        return { data, unauthorized: false };
    },
});

// ===== ALLOCATE COURSE =====

export const allocate = mutation({
    args: {
        sessionId: v.optional(v.string()),
        lecturerId: v.id("users"),
        courseId: v.id("courses"),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { success: false, error: "Unauthorized" };

        const hasGlobalManage = userHasCapability(user, "access:allocations:courses");

        if (!hasGlobalManage) {
            // Dean or Coordinator check
            const faculty = await ctx.db.query("faculties").filter(q => q.eq(q.field("deanId"), user._id)).first();
            const program = await ctx.db.get(args.programId);
            const isAuthorized = faculty || (program as any)?.coordinatorId === user._id;

            if (!isAuthorized) {
                return { success: false, error: "Unauthorized: Missing capability access:allocations:courses or leadership status." };
            }
        }

        // Check existing using precise composite index
        const existing = await ctx.db
            .query("courseAllocations")
            .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
            .filter(q => q.and(
                q.eq(q.field("year"), args.year),
                q.eq(q.field("semester"), args.semester),
                q.eq(q.field("programId"), args.programId)
            ))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                lecturerId: args.lecturerId,
            });
        } else {
            await ctx.db.insert("courseAllocations", {
                lecturerId: args.lecturerId,
                courseId: args.courseId,
                programId: args.programId,
                semester: args.semester,
                year: args.year,
            });
        }

        // SYNC: Update all timetable slots for this course
        const timetableSlots = await ctx.db
            .query("timeSlots")
            .withIndex("by_course_period", (q) =>
                q.eq("courseId", args.courseId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .collect();

        for (const slot of timetableSlots) {
            if (slot.lecturerId !== args.lecturerId) {
                await ctx.db.patch(slot._id, { lecturerId: args.lecturerId });
            }
        }

        await logAction(ctx, user._id, "ALLOCATE_COURSE", `Course: ${args.courseId}`);

        return { success: true };
    },
});

// ===== DELETE ALLOCATION =====

export const deleteAllocation = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("courseAllocations"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:allocations:courses");
        if (!user) return { success: false, error: "Unauthorized" };

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_ALLOCATION", `ID: ${args.id}`);

        return { success: true };
    },
});

// ===== GET ASSIGNED COURSES (FOR SIDEBAR) =====

export const getAssignedCourses = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_lecturer_period", (q) =>
                q.eq("lecturerId", user._id)
                 .eq("year", args.year)
                 .eq("semester", args.semester)
            )
            .collect();

        const [allAssessments, allSlots, allRegistration] = await Promise.all([
            ctx.db.query("assessments")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect(),
            ctx.db.query("timeSlots")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect(),
            ctx.db.query("studentCourseRegistrations")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect(),
        ]);

        const data = await Promise.all(allocations.map(async (a) => {
            const courseInfo = await ctx.db.get(a.courseId);
            
            // Metrics
            const registeredStudents = allRegistration.filter(r => r.courseId === a.courseId);
            const courseAssessments = allAssessments.filter(as =>
                as.courseId === a.courseId &&
                as.finalScore !== undefined
            );
            const averageScore = courseAssessments.length > 0
                ? courseAssessments.reduce((sum, as) => sum + (as.finalScore || 0), 0) / courseAssessments.length
                : undefined;

            const courseSlots = allSlots.filter(s => s.courseId === a.courseId);
            const nextSlot = courseSlots.sort((x, y) => (x.startTime || "").localeCompare(y.startTime || ""))[0];

            return {
                ...a,
                courseTitle: courseInfo?.title || "Unknown",
                courseCode: courseInfo?.code || "N/A",
                studentCount: registeredStudents.length,
                averageScore,
                nextLesson: nextSlot ? `${nextSlot.day} ${nextSlot.startTime}` : "Not Scheduled",
            };
        }));

        return { data, unauthorized: false };
    },
});

export const syncCourseAllocations = mutation({
    args: {
        sessionId: v.optional(v.string()),
        sourceSemester: v.number(),
        sourceYear: v.number(),
        targetSemester: v.number(),
        targetYear: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:allocations:courses");
        if (!user) return { success: false, error: "Unauthorized" };

        const sourceAllocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", (q) =>
                q.eq("year", args.sourceYear)
                 .eq("semester", args.sourceSemester)
            )
            .collect();

        if (sourceAllocations.length === 0) {
            return { success: false, error: "No course allocations found in source period." };
        }

        // Clear target
        const targetAllocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", (q) =>
                q.eq("year", args.targetYear)
                 .eq("semester", args.targetSemester)
            )
            .collect();
        
        for (const alloc of targetAllocations) {
            await ctx.db.delete(alloc._id);
        }

        // Clone
        for (const alloc of sourceAllocations) {
            await ctx.db.insert("courseAllocations", {
                lecturerId: alloc.lecturerId,
                courseId: alloc.courseId,
                programId: alloc.programId,
                year: args.targetYear,
                semester: args.targetSemester,
            });
        }

        await logAction(ctx, user._id, "SYNC_COURSE_ALLOCATIONS", `Synced to S${args.targetSemester} ${args.targetYear}`);
        return { success: true, count: sourceAllocations.length };
    },
});

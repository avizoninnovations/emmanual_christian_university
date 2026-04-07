import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkCapability, logAction } from "./authHelpers";
import { Id } from "./_generated/dataModel";

/**
 * STUDENT DEFERRALS (DEAD SEMESTER)
 */

export const requestDeferral = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        semester: v.number(),
        year: v.number(),
        reason: v.string(),
        returnDate: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:manage");
        if (!user) return { success: false, error: "Unauthorized" };
        
        const deferralId = await ctx.db.insert("semesterDeferrals", {
            studentId: args.studentId,
            programId: (await ctx.db.get(args.studentId))?.programId as Id<"programs">,
            semester: args.semester,
            year: args.year,
            reason: args.reason,
            approvedBy: user._id,
            status: "Approved",
            createdAt: Date.now(),
            returnDate: args.returnDate
        });

        // Update student status to 'Suspended' or 'Deferred' if applicable
        // User asked for "Dead Semesters", which usually means they are not active for that period
        await ctx.db.patch(args.studentId, {
            status: "Suspended" // Or add a "Deferred" status if preferred
        });

        await logAction(ctx, user._id, "STUDENT_DEFERRAL", `Approved dead semester for student ${args.studentId} (${args.semester}/${args.year})`);
        
        return { success: true, deferralId };
    }
});

export const getStudentDeferrals = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students")
    },
    handler: async (ctx, args) => {
        await checkCapability(ctx, args.sessionId, "access:students");
        return await ctx.db
            .query("semesterDeferrals")
            .withIndex("by_student", q => q.eq("studentId", args.studentId))
            .collect();
    }
});

/**
 * MISSED EXAMS & SUPPLEMENTALS
 */

export const reportMissedExam = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number(),
        reason: v.string(),
        hasSupportingDocs: v.boolean()
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:academics:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const missedExamId = await ctx.db.insert("missedExams", {
            studentId: args.studentId,
            courseId: args.courseId,
            semester: args.semester,
            year: args.year,
            reason: args.reason,
            hasSupportingDocs: args.hasSupportingDocs,
            status: "Pending",
            recordedBy: user._id
        });

        await logAction(ctx, user._id, "MISSED_EXAM_REPORTED", `Reported missed exam for student ${args.studentId} in course ${args.courseId}`);
        
        return { success: true, missedExamId };
    }
});

/**
 * RETAKES & COURSE REGISTRATION
 */

export const registerRetake = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:academics:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        // Check if already registered
        const existing = await ctx.db
            .query("studentCourseRegistrations")
            .withIndex("by_student_period", q => 
                q.eq("studentId", args.studentId)
                 .eq("semester", args.semester)
                 .eq("year", args.year)
            )
            .filter(q => q.eq(q.field("courseId"), args.courseId))
            .first();

        if (existing) return { success: false, error: "Student is already registered for this course in this period." };

        const student = await ctx.db.get(args.studentId);
        if (!student?.programId) return { success: false, error: "Student must be assigned to a program." };

        const registrationId = await ctx.db.insert("studentCourseRegistrations", {
            studentId: args.studentId,
            courseId: args.courseId,
            programId: student.programId,
            semester: args.semester,
            year: args.year,
            status: "Registered",
            isRetake: true
        });

        // Optionally add a retake fee here if needed in Phase 4
        
        await logAction(ctx, user._id, "COURSE_RETAKE_REGISTERED", `Registered retake for student ${args.studentId} in course ${args.courseId}`);
        
        return { success: true, registrationId };
    }
});

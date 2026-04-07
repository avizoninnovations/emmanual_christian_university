// Assessments & Grading Module (University Grade)
// Standardizes terminology (Course, Semester) and implements HOD marks approval workflow

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// ===== GET ASSESSMENTS =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.optional(v.id("programs")),
        studentId: v.optional(v.id("students")),
        courseId: v.optional(v.id("courses")),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        let assessments;

        if (args.studentId) {
            assessments = await ctx.db
                .query("assessments")
                .withIndex("by_student_period", (q) =>
                    q.eq("studentId", args.studentId!).eq("semester", args.semester).eq("year", args.year)
                )
                .collect();
        } else if (args.courseId) {
            assessments = await ctx.db
                .query("assessments")
                .withIndex("by_course_period", (q) =>
                    q.eq("courseId", args.courseId!).eq("semester", args.semester).eq("year", args.year)
                )
                .collect();
        } else if (args.programId) {
            assessments = await ctx.db
                .query("assessments")
                .withIndex("by_program_period", (q) =>
                    q.eq("programId", args.programId!).eq("semester", args.semester).eq("year", args.year)
                )
                .collect();
        } else {
            assessments = await ctx.db
                .query("assessments")
                .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
                .collect();
        }

        // Enrich with Student Names
        const studentIds = [...new Set(assessments.map(a => a.studentId))];
        const rawStudents = await Promise.all(studentIds.map(id => ctx.db.get(id)));
        const studentMap = new Map(rawStudents.filter(Boolean).map(s => [s!._id, s]));

        return {
            data: assessments.map((a) => {
                const s = studentMap.get(a.studentId) as any;
                return {
                    ...a,
                    studentName: s ? `${s.firstName} ${s.lastName}` : "Unknown Student",
                };
            }),
            unauthorized: false
        };
    },
});

// ===== UPSERT ASSESSMENT (Lecturer Save/Submit) =====

export const upsert = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        programId: v.optional(v.id("programs")),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number(),
        courseworkMarks: v.optional(v.number()),
        examMarks: v.optional(v.number()),
        finalScore: v.optional(v.number()),
        grade: v.optional(v.string()),
        gradePoints: v.optional(v.number()),
        status: v.optional(v.union(v.literal("Draft"), v.literal("Submitted"))),
        lecturerComment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, ...data } = args;

        const existing = await ctx.db
            .query("assessments")
            .withIndex("by_student_period", (q) =>
                q.eq("studentId", data.studentId).eq("semester", data.semester).eq("year", data.year)
            )
            .filter((q) => q.eq(q.field("courseId"), data.courseId))
            .first();

        // Check workflow constraints
        if (existing) {
            // If Approved/Released, block edits UNLESS lecturerEditAccess is true
            if ((existing.status === "Approved" || existing.status === "Released") && !existing.lecturerEditAccess) {
                return { success: false, error: "Marks have already been Approved/Released. Contact HOD for edit access." };
            }
        }

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...data,
                // Clear the one-off edit flag if it was used to perform an update
                lecturerEditAccess: false,
                updatedAt: Date.now(),
            });
            return { success: true, assessmentId: existing._id };
        } else {
            const assessmentId = await ctx.db.insert("assessments", {
                ...data,
                status: data.status || "Draft",
                createdAt: Date.now(),
            });
            return { success: true, assessmentId };
        }
    },
});

// ===== HOD APPROVAL (Bulk or Single) =====

export const approveMarks = mutation({
    args: {
        sessionId: v.optional(v.string()),
        assessmentIds: v.array(v.id("assessments")),
        hodComment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:oversight:dean");
        if (!user) return { success: false, error: "Only the Dean can approve marks." };

        for (const id of args.assessmentIds) {
            const assessment = await ctx.db.get(id);
            if (assessment && (assessment.status === "Submitted" || assessment.status === "Draft")) {
                await ctx.db.patch(id, {
                    status: "Approved",
                    hodComment: args.hodComment,
                    editedByHOD: false, // Reset flag on approval
                });
            }
        }

        await logAction(ctx, user._id, "APPROVE_MARKS", `Approved ${args.assessmentIds.length} assessment records`);
        return { success: true };
    },
});

export const grantLecturerEditAccess = mutation({
    args: {
        sessionId: v.optional(v.string()),
        assessmentId: v.id("assessments"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:oversight:dean");
        if (!user) return { success: false, error: "Unauthorized" };

        await ctx.db.patch(args.assessmentId, {
            lecturerEditAccess: true,
        });

        await logAction(ctx, user._id, "GRANT_EDIT_ACCESS", `Granted edit access for assessment ${args.assessmentId}`);
        return { success: true };
    },
});

// ===== HOD MARK OVERRIDE (Audit Tracked) =====

export const hodUpdateMark = mutation({
    args: {
        sessionId: v.optional(v.string()),
        assessmentId: v.id("assessments"),
        courseworkMarks: v.optional(v.number()),
        examMarks: v.optional(v.number()),
        finalScore: v.optional(v.number()),
        grade: v.optional(v.string()),
        hodComment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:oversight:dean");
        if (!user) return { success: false, error: "Unauthorized" };

        const { sessionId, assessmentId, ...updates } = args;

        await ctx.db.patch(assessmentId, {
            ...updates,
            editedByHOD: true,
            updatedAt: Date.now(),
        });

        await logAction(ctx, user._id, "HOD_MARK_OVERRIDE", `HOD edited marks for assessment ${assessmentId}`);
        return { success: true };
    },
});

// ===== LECTURER PERFORMANCE ANALYTICS (HOD View) =====

export const getLecturerPerformance = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.id("faculties"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:oversight:dean");
        if (!user) return { data: [], unauthorized: true };

        const faculty = await ctx.db.get(args.facultyId);
        if (!faculty) return { data: [], unauthorized: false };

        const facultyCourseIds = new Set(faculty.courses || []);

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", q => q.eq("year", args.year).eq("semester", args.semester))
            .collect();

        const relevantAllocations = allocations.filter(a => facultyCourseIds.has(a.courseId));
        
        const results = await Promise.all(relevantAllocations.map(async (alloc) => {
            const lecturer = await ctx.db.get(alloc.lecturerId);
            const course = await ctx.db.get(alloc.courseId);
            
            const assessments = await ctx.db
                .query("assessments")
                .withIndex("by_course_period", q => q.eq("courseId", alloc.courseId).eq("semester", args.semester).eq("year", args.year))
                .collect();

            const submittedCount = assessments.filter(a => a.status !== "Draft").length;
            const totalCount = assessments.length;
            const avgScore = totalCount > 0 
                ? assessments.reduce((acc, a) => acc + (a.finalScore || 0), 0) / totalCount 
                : 0;

            return {
                lecturerName: lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : "Unknown",
                courseTitle: course?.title || "Unknown",
                courseCode: course?.code || "N/A",
                submissionRate: totalCount > 0 ? (submittedCount / totalCount) * 100 : 0,
                averageScore: Math.round(avgScore * 10) / 10,
                totalStudents: totalCount,
            };
        }));

        return { data: results, unauthorized: false };
    },
});

// ===== REGISTRAR RELEASE (Final Reveal to Student Portal) =====

export const releaseMarks = mutation({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
        courseId: v.optional(v.id("courses")),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:oversight:registrar");
        if (!user) return { success: false, error: "Only the Registrar can release marks to the portal." };

        let q = ctx.db.query("assessments")
            .withIndex("by_program_period", (q) => 
                q.eq("programId", args.programId).eq("semester", args.semester).eq("year", args.year)
            );
        
        if (args.courseId) {
            q = q.filter(qb => qb.eq(qb.field("courseId"), args.courseId));
        }

        const assessments = await q.filter(qb => qb.eq(qb.field("status"), "Approved")).collect();

        for (const a of assessments) {
            await ctx.db.patch(a._id, {
                status: "Released",
            });
        }

        await logAction(ctx, user._id, "RELEASE_MARKS", `Released ${assessments.length} marks for program ${args.programId}`);
        return { success: true, count: assessments.length };
    },
});

// ===== CALCULATE SEMESTER GPA =====

export const calculateSemesterGPA = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const assessments = await ctx.db
            .query("assessments")
            .withIndex("by_student_period", (q) =>
                q.eq("studentId", args.studentId).eq("semester", args.semester).eq("year", args.year)
            )
            .filter(q => q.neq(q.field("gradePoints"), undefined))
            .collect();

        if (assessments.length === 0) return { data: { gpa: 0, totalCredits: 0 }, unauthorized: false };

        const courseIds = assessments.map(a => a.courseId);
        const courses = await Promise.all(courseIds.map(id => ctx.db.get(id)));
        const courseMap = new Map(courses.filter(Boolean).map(c => [c!._id, c]));

        let totalPoints = 0;
        let totalCredits = 0;

        for (const a of assessments) {
            const course = courseMap.get(a.courseId);
            const credits = (course as any)?.credits || 3;
            if (a.gradePoints !== undefined) {
                totalPoints += (a.gradePoints * credits);
                totalCredits += credits;
            }
        }

        const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

        return {
            data: {
                gpa: Math.round(gpa * 100) / 100,
                totalCredits,
                courseCount: assessments.length
            },
            unauthorized: false
        };
    },
});

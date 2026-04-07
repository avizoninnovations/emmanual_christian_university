import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUser, userHasCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";
import { getStudentsForPeriod } from "./historyHelpers";

/**
 * Identifies the user's oversight role and scope.
 * Automatic Dean detection + Permission-based DOS detection.
 */
export const getOversightContext = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { isDOS: false, isDean: false, faculties: [], unauthorized: true };

        const isDOS = userHasCapability(user, "access:oversight:dos");

        // Dean detection: Find faculties where this user is the dean
        const managedFaculties = await ctx.db
            .query("faculties")
            .withIndex("by_dean", (q) => q.eq("deanId", user._id))
            .collect();

        return {
            isDOS,
            isDean: managedFaculties.length > 0,
            faculties: managedFaculties.map(f => ({
                _id: f._id,
                name: f.name,
            })),
            unauthorized: false
        };
    }
});

/**
 * Returns all programs available for oversight.
 * DOS see all; Deans see programs where their faculty courses are taught.
 */
export const getOversightPrograms = query({
    args: {
        sessionId: v.optional(v.string()),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return [];

        const isDOS = userHasCapability(user, "access:oversight:dos");

        if (isDOS) {
            // DOS sees everything
            return await ctx.db
                .query("programs")
                .collect();
        }

        // Dean logic: Get faculties -> Get programs in those faculties
        const managedFaculties = await ctx.db
            .query("faculties")
            .withIndex("by_dean", (q) => q.eq("deanId", user._id))
            .collect();

        if (managedFaculties.length === 0) return [];

        const facultyIds = new Set(managedFaculties.map(f => f._id));

        const allPrograms = await ctx.db.query("programs").collect();
        const programs = allPrograms.filter(p => p.facultyId && facultyIds.has(p.facultyId));

        return programs.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }
});

/**
 * Independent data fetcher for a program.
 * Checks for DOS/Dean status directly to bypass granular module permissions.
 */
export const getProgramOversightData = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { unauthorized: true, error: "You need to be logged in to view oversight data." };

        // Auth: Check DOS first
        let hasAccess = userHasCapability(user, "access:oversight:dos");

        // Dean check if not DOS
        if (!hasAccess) {
            const managedFaculties = await ctx.db
                .query("faculties")
                .withIndex("by_dean", (q) => q.eq("deanId", user._id))
                .collect();

            if (managedFaculties.length > 0) {
                const programDoc = await ctx.db.get(args.programId);
                hasAccess = managedFaculties.some(f => f._id === programDoc?.facultyId);
            }
        }

        if (!hasAccess) return { unauthorized: true, error: "You don't have permission to view oversight details for this program." };

        // Fetch Program Details
        const programDoc = await ctx.db.get(args.programId);
        if (!programDoc) return null;

        // Fetch Students exactly from the requested period
        const students = await getStudentsForPeriod(ctx, args.programId, args.semester, args.year);

        // Fetch Attendance Summary
        const attendance = await ctx.db
            .query("attendance")
            .withIndex("by_program_period", q =>
                q.eq("programId", args.programId).eq("semester", args.semester).eq("year", args.year)
            )
            .collect();

        // Fetch Course Allocations (Assigned Staff)
        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_program_period", (q) => q.eq("programId", args.programId).eq("year", args.year).eq("semester", args.semester))
            .collect();

        const staffData = await Promise.all(
            allocations.map(async (alloc) => {
                const lecturer = await ctx.db.get(alloc.lecturerId);
                const course = await ctx.db.get(alloc.courseId);
                return {
                    courseTitle: course?.title || "Unknown Course",
                    courseCode: course?.code || "???",
                    lecturerId: alloc.lecturerId,
                    lecturerName: lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : "Unknown",
                    lecturerAvatar: lecturer?.avatarUrl,
                };
            })
        );

        // Fetch Fee Structure for this Program Level/Semester/Year
        const feeStructure = await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", q =>
                q.eq("programId", args.programId)
                    .eq("semesterNumber", args.semester)
            )
            .first();

        // Student Summaries (Attendance + Finance Balance)
        const roster = await Promise.all(
            students.map(async (student) => {
                const effectiveBalance = (student.balance || 0) + (feeStructure?.total ?? 0);

                return {
                    id: student._id,
                    name: `${student.firstName} ${student.lastName}`,
                    registrationNumber: student.registrationNumber,
                    gender: student.gender,
                    avatarUrl: student.avatarUrl,
                    balance: effectiveBalance,
                    atRisk: effectiveBalance > 500000, // Higher threshold for university
                    status: student.status,
                };
            })
        );

        return {
            programInfo: {
                id: programDoc._id,
                name: programDoc.name,
                code: programDoc.code,
                awardType: programDoc.awardType,
            },
            students: roster,
            staff: staffData,
            totalStudents: roster.length,
            attendanceCount: attendance.length,
        };
    }
});

/**
 * Discipline history was removed from the university schema.
 * Returning empty for now.
 */
export const getOversightDisciplineHistory = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        return [];
    },
});

/**
 * Fetches the complete marksheet for a program/semester.
 */
export const getOversightMarksheet = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { unauthorized: true, error: "You need to be logged in to view the marksheet." };

        // Auth
        let hasAccess = userHasCapability(user, "access:oversight:dos");
        if (!hasAccess) {
            const managedFaculties = await ctx.db
                .query("faculties")
                .withIndex("by_dean", (q) => q.eq("deanId", user._id))
                .collect();
            if (managedFaculties.length > 0) {
                const programDoc = await ctx.db.get(args.programId);
                hasAccess = managedFaculties.some(f => f._id === programDoc?.facultyId);
            }
        }
        if (!hasAccess) return { unauthorized: true, error: "You don't have permission to view oversight marks for this program." };

        // 1. Get Students
        const students = await getStudentsForPeriod(ctx, args.programId, args.semester, args.year);

        // 2. Get All Assessments for the program/period
        const assessments = await ctx.db
            .query("assessments")
            .withIndex("by_program_period", (q) =>
                q.eq("programId", args.programId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .collect();

        // 3. Extract unique courses present in the assessments
        const courseIds = Array.from(new Set(assessments.map(a => a.courseId).filter((s): s is Id<"courses"> => !!s)));
        const rawCourses = await Promise.all(courseIds.map(id => ctx.db.get(id)));
        const courseMap = new Map(rawCourses.filter(Boolean).map(c => [c!._id, c!.title]));

        // 4. Build the grid
        const grid = students.map(student => {
            const studentMarks: Record<string, number | string> = {};

            courseIds.forEach(id => {
                const title = courseMap.get(id) || "Unknown";
                const courseAssessments = assessments.filter(a => a.studentId === student._id && a.courseId === id);

                if (courseAssessments.length > 0) {
                    const total = courseAssessments.reduce((acc, a) => acc + (a.finalScore || 0), 0);
                    studentMarks[title] = Math.round(total / courseAssessments.length);
                } else {
                    studentMarks[title] = "-";
                }
            });

            return {
                studentId: student._id,
                studentName: `${student.firstName} ${student.lastName}`,
                registrationNumber: student.registrationNumber,
                marks: studentMarks,
            };
        });

        return {
            courses: Array.from(courseMap.values()),
            records: grid,
        };
    }
});

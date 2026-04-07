import { query } from "./_generated/server";
import { v } from "convex/values";
import { checkQueryAuth } from "./authHelpers";
import { Id } from "./_generated/dataModel";
import { calculateRankings, calculateGrade, getRemarks } from "./reportUtils";

export const getReportData = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
        studentId: v.optional(v.id("students")),
    },
    handler: async (ctx, args) => {
        const { user, unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:reports:view");
        if (unauthorized) return { unauthorized: true };

        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const programDetails = await ctx.db.get(args.programId);
        if (!programDetails) return { error: "Program not found" };

        // 1. Get all students in the class
        const students = await ctx.db
            .query("students")
            .withIndex("by_program", (q) => q.eq("programId", args.programId))
            .filter((q) => q.eq(q.field("status"), "Active"))
            .collect();

        // 2. Fetch all course allocations for this program and period
        const courseAllocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", (q) => 
                q.eq("year", args.year)
                 .eq("semester", args.semester)
            )
            .collect();

        // Filter allocations that belong to courses in this program
        const programCourses = await ctx.db.query("courses")
            .filter(q => q.neq(q.field("programIds"), undefined))
            .collect();
        
        const programCourseIds = new Set(programCourses
            .filter(c => c.programIds?.includes(args.programId))
            .map(c => c._id));

        const programAllocations = courseAllocations.filter(a => programCourseIds.has(a.courseId));
        const programCurriculum = Array.from(new Set(programAllocations.map(a => a.courseId)));

        // 3. Fetch all assessments and attendance
        const allAssessments = await ctx.db
            .query("assessments")
            .withIndex("by_program_period", (q) => 
                q.eq("programId", args.programId)
                .eq("semester", args.semester)
                .eq("year", args.year)
            )
            .collect();

        const allAttendance = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => 
                q.eq("semester", args.semester)
                .eq("year", args.year)
            )
            .collect();

        // 4. Calculate rankings using shared utility
        const studentStats = students.map(s => {
            const studentAssessments = allAssessments.filter(a => a.studentId === s._id);
            const totalMarks = studentAssessments.reduce((sum, a) => sum + (a.finalScore || 0), 0);
            return {
                studentId: s._id as string,
                totalMarks
            };
        });

        const rankings = calculateRankings(studentStats);

        const summary = {
            totalStudents: students.length,
            totalSubjects: programCurriculum.length,
            subjectsAllocated: programCurriculum,
            period: { semester: args.semester, year: args.year },
            programDetails: {
                name: programDetails.name,
                code: programDetails.code
            }
        };

        const generateReportCard = (s: any) => {
            const studentAssessments = allAssessments.filter(a => a.studentId === s._id);
            const studentAttendance = allAttendance.filter(a => a.studentId === s._id);
            
            // Map assessments to the full curriculum
            const dynamicAssessments = programCurriculum.map((courseId: Id<"courses">) => {
                const existing = studentAssessments.find(a => a.courseId === courseId);
                const marks = existing?.finalScore ?? null;
                return {
                    id: existing?._id || `placeholder-${courseId}`,
                    courseId: courseId,
                    marks,
                    grade: calculateGrade(marks),
                    teacherComment: existing?.lecturerComment || "",
                    isSet: !!existing
                };
            });

            // Fallback safety
            const finalAssessments = dynamicAssessments.length > 0 ? dynamicAssessments : studentAssessments.map(a => ({
                id: a._id,
                courseId: a.courseId,
                marks: a.finalScore ?? null,
                grade: calculateGrade(a.finalScore),
                teacherComment: a.lecturerComment || "",
                isSet: true
            }));

            const totalMarks = finalAssessments.reduce((sum, a) => sum + (a.marks || 0), 0);
            const averageMark = finalAssessments.length > 0 ? (totalMarks / finalAssessments.length).toFixed(1) : "0";
            
            return {
                student: {
                    id: s.registrationNumber || (s._id as string),
                    rawId: s._id as string,
                    firstName: s.firstName,
                    lastName: s.lastName,
                    avatarUrl: s.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${s.firstName}${s.lastName}`,
                },
                programDetails: {
                    id: programDetails._id,
                    name: programDetails.name,
                    code: programDetails.code,
                },
                semester: args.semester,
                year: args.year,
                assessments: finalAssessments,
                attendance: {
                    present: studentAttendance.filter(att => att.status === "Present" || att.status === "Late").length,
                    total: studentAttendance.length || 0,
                },
                position: rankings.get(s._id),
                totalStudents: students.length,
                totalAggregates: totalMarks,
                averageMark: averageMark,
                teacherComment: "",
                deanComment: "",
                nextSemesterBegins: "",
            };
        };

        // If specific studentId is provided, return only that
        if (args.studentId) {
            const student = students.find(s => s._id === args.studentId);
            return {
                data: student ? [generateReportCard(student)] : [],
                summary
            };
        }

        return {
            data: students.map(generateReportCard),
            summary
        };
    },
});

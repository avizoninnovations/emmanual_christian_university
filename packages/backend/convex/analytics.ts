//Analytics Module
// Session-based auth

import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, checkCapability, userHasCapability, checkQueryAuth } from "./authHelpers";
import { Doc, Id } from "./_generated/dataModel";

export const getStudentAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.optional(v.union(v.id("programs"), v.literal("all"))), 
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        // Fetch Active grouped students: Active, Repeater, Suspended
        let students;
        if (args.programId && args.programId !== "all") {
            students = await ctx.db
                .query("students")
                .withIndex("by_program", (q) => q.eq("programId", args.programId as any))
                .filter(q => q.or(
                    q.eq(q.field("status"), "Active"),
                    q.eq(q.field("status"), "Repeater"),
                    q.eq(q.field("status"), "Suspended")
                ))
                .collect();
        } else {
            students = await ctx.db
                .query("students")
                .filter(q => q.or(
                    q.eq(q.field("status"), "Active"),
                    q.eq(q.field("status"), "Repeater"),
                    q.eq(q.field("status"), "Suspended")
                ))
                .collect();
        }

        const activeStudents = students;
        const boys = activeStudents.filter(s => s.gender === "Male").length;
        const girls = activeStudents.filter(s => s.gender === "Female").length;

        const data = {
            totalStudents: activeStudents.length,
            boys,
            girls,
            attendanceRate: 92, // Mock percentage
            avgScore: 74, // Mock percentage
            gradeDistribution: [
                { grade: 'D1', count: 12 },
                { grade: 'D2', count: 25 },
                { grade: 'C3', count: 40 },
                { grade: 'C4', count: 35 },
                { grade: 'C5', count: 20 },
                { grade: 'C6', count: 15 },
                { grade: 'O', count: 8 },
                { grade: 'F', count: 4 },
            ],
            subjectPerformance: [],
            semesterTrends: [
                { semester: 'Semester 1', avg: 70 },
                { semester: 'Semester 2', avg: 75 },
                { semester: 'Semester 3', avg: 74 },
            ],
        };
        return { data, unauthorized: false };
    },
});

export const getStaffAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        const staff = await ctx.db.query("users").collect();
        const teachingStaff = staff.filter(s => ["ViceChancellor", "Dean", "Lecturer", "AcademicRegistrar", "Teacher", "Lecturer"].includes(s.role));
        const supportStaff = staff.length - teachingStaff.length;

        const males = staff.filter(s => (s.gender || 'Male') === 'Male').length;
        const females = staff.length - males;

        const data = {
            totalStaff: staff.length,
            teachingStaff: teachingStaff.length,
            supportStaff,
            genderDistribution: [
                { name: 'Male', value: males },
                { name: 'Female', value: females },
            ],
            teacherLoad: teachingStaff.slice(0, 5).map(s => ({
                name: `${s.firstName} ${s.lastName}`,
                courses: 3
            })),
            teacherPerformance: teachingStaff.slice(0, 5).map(s => ({
                name: `${s.firstName} ${s.lastName}`,
                score: 80 + Math.floor(Math.random() * 15)
            })),
        };
        return { data, unauthorized: false };
    },
});

export const getParentAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        const guardians = await ctx.db.query("emergencyContacts").collect();
        const payments = await ctx.db.query("payments").collect();

        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const semester = schoolConfig?.currentSemester || 1;

        const [activeStudents, feeStructures, allPrograms] = await Promise.all([
            ctx.db.query("students").withIndex("by_status", q => q.eq("status", "Active")).collect(),
            ctx.db.query("feeStructures").filter(q => q.eq(q.field("semesterNumber"), semester)).collect(),
            ctx.db.query("programs").collect()
        ]);

        const feeMap = new Map<string, any>(
            feeStructures.filter(f => f.programId).map(f => [f.programId as string, f])
        );
        const totalOutstanding = activeStudents.reduce((sum, s) => {
            const structure = s.programId ? feeMap.get(s.programId) : null;
            const expected = structure?.total ?? 0;
            return sum + (s.balance || 0) + expected;
        }, 0);

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        const data = {
            totalGuardians: guardians.length,
            feeCollectionRate: 85,
            totalOutstanding,
            paymentMethodStats: [
                { name: 'Cash', value: 30 },
                { name: 'Bank Slip', value: 50 },
                { name: 'Mobile Money', value: 20 },
            ],
            guardianRelationships: [
                { name: 'Father', value: guardians.filter(g => (g as any).relationship === "Father").length },
                { name: 'Mother', value: guardians.filter(g => (g as any).relationship === "Mother").length },
                { name: 'Guardian', value: guardians.filter(g => (g as any).relationship === "Guardian").length },
            ],
        };
        return { data, unauthorized: false };
    },
});

export const getDashboardMetrics = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        const config = await ctx.db.query("schoolConfig").first();

        const semester = args.semester || config?.currentSemester || 1;
        const year = args.year || config?.currentYear || new Date().getFullYear();

        const [activeStudents, payments, expenses, enrollmentStats, feeStructures] = await Promise.all([
            ctx.db.query("students")
                .filter(q => q.or(
                    q.eq(q.field("status"), "Active"),
                    q.eq(q.field("status"), "Repeater"),
                    q.eq(q.field("status"), "Suspended")
                ))
                .collect(),
            ctx.db.query("payments").withIndex("by_period", q => q.eq("semester", semester).eq("year", year)).collect(),
            ctx.db.query("expenses").withIndex("by_period", q => q.eq("semester", semester).eq("year", year)).collect(),
            ctx.db.query("programs").collect(),
            ctx.db.query("feeStructures").filter(q => q.eq(q.field("semesterNumber"), semester)).collect(),
        ]);

        const feeMap = new Map<string, any>(
            feeStructures.filter(f => f.programId).map(f => [f.programId as string, f])
        );
        const totalStudents = activeStudents.length;
        const collected = payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = activeStudents.reduce((sum, s) => {
            const structure = s.programId ? feeMap.get(s.programId) : null;
            const expected = structure?.total ?? 0;
            return sum + (s.balance || 0) + expected;
        }, 0);

        const data = {
            kpi: {
                totalStudents,
                avgPerformance: 72,
                attendanceRate: 94,
                collectionRate: Math.round((collected / (collected + outstanding)) * 100) || 0,
            },
            subjectPerformance: [],
            teacherPerformance: [],
            attendanceTrends: [],
            financials: {
                collected,
                outstanding,
                collectionRate: Math.round((collected / (collected + outstanding)) * 100) || 0,
            },
            enrollment: await Promise.all(enrollmentStats.slice(0, 5).map(async p => ({
                program: p.name,
                // Optimized: Use by_program index for counting
                count: (await ctx.db.query("students").withIndex("by_program", q => q.eq("programId", p._id)).filter(q => q.or(
                    q.eq(q.field("status"), "Active"),
                    q.eq(q.field("status"), "Repeater"),
                    q.eq(q.field("status"), "Suspended")
                )).collect()).length
            }))),
        };
        return { data, unauthorized: false };
    },
});

// === ACADEMIC DASHBOARD ANALYTICS ===
export const getAcademicAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        term: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        // 1. Staff
        const staff = await ctx.db.query("users").collect();
        const lecturers = staff.filter(s => s.role === 'Lecturer' || s.role === 'Dean').length;

        // 2. Faculties
        const faculties = await ctx.db.query("faculties").collect();

        // 3. Performance (Mocked aggregation based on term)
        const avgPerformance = 68; // Placeholder

        // 4. Faculty Performance (Enriched)
        const facultyPerformance = await Promise.all(faculties.map(async (f) => {
            const dean = f.deanId ? await ctx.db.get(f.deanId) : null;
            return {
                name: f.name,
                dean: dean ? `${dean.firstName} ${dean.lastName}` : "TBA",
                syllabusCoverage: 85, // Mock
                assessmentCompletion: 90 // Mock
            };
        }));

        const data = {
            lecturers,
            facultiesCount: faculties.length,
            avgPerformance,
            atRisk: 15, // Mock 'At Risk' students count
            facultyPerformance
        };
        return { data, unauthorized: false };
    }
});

// === BOARDING DASHBOARD ANALYTICS - DEPRECATED ===
export const getBoardingAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        term: v.number(),
        year: v.number(),
    },
    handler: async () => {
        return {
            data: {
                totalBoarders: 0,
                totalDorms: 0,
                presentTonight: 0,
                sickBay: 0,
                dorms: []
            },
            unauthorized: false
        };
    }
});

// === SECRETARY DASHBOARD ANALYTICS ===
export const getSecretaryAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "system:view_analytics");
        if (unauthorized) return { data: null, unauthorized: true };

        // Optimized: Use by_stage index to count new applications
        const newApps = (await ctx.db.query("applicants").withIndex("by_stage", q => q.eq("stage", "New")).collect()).length;
        const pendingMessages = 5;
        const staff = await ctx.db.query("users").filter(q => q.neq(q.field("role"), "Guardian")).collect();
        const totalStaff = staff.length;
        const todayVisitors = 3;

        // Optimized: Fetch recent apps desc
        const recentAppsRaw = await ctx.db.query("applicants").order("desc").take(3);

        const recentApps = recentAppsRaw.map(a => ({
            name: a.applicantName,
            program: a.targetProgramId || "Pending",
            date: "Today", 
            status: a.stage
        }));

        const data = {
            newApplications: newApps,
            pendingMessages,
            totalStaff,
            todayVisitors,
            recentApps
        };
        return { data, unauthorized: false };
    }
});

// === TEACHER DASHBOARD ANALYTICS ===
export const getTeacherAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number()
    },
    handler: async (ctx, args) => {
        const { user, unauthorized } = await checkQueryAuth(ctx, args.sessionId);
        if (unauthorized || !user) return { data: null, unauthorized: true };

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_lecturer_period", q => q.eq("lecturerId", user._id).eq("year", args.year).eq("semester", args.semester))
            .collect();

        const programIds = new Set(allocations.map(a => a.programId as any));
        const allStudents = await ctx.db.query("students").filter(q => q.eq(q.field("status"), "Active")).collect();
        const myStudents = allStudents.filter(s => s.programId && programIds.has(s.programId as any));
        const programsAssigned = programIds.size;
        const lessonsToday = 4; // Mock
        const avgPerformance = 68; // Mock

        const programsDocs = await Promise.all(
            Array.from(programIds).map(id => ctx.db.get(id as Id<"programs">))
        );
        const programMap = new Map(
            programsDocs
                .filter((p): p is Doc<"programs"> => p !== null)
                .map(p => [p._id as string, p.name])
        );

        // Precise Sudanese time (EAT - UTC+3)
        const formatOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Africa/Khartoum',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        };
        const sudanTimeStr = new Intl.DateTimeFormat('en-GB', formatOptions).format(new Date());
        const [localH, localM] = sudanTimeStr.split(':').map(Number);
        const currentTimeInMinutes = (localH * 60) + localM;

        // Simple time helper
        const getSlotStatus = (timeStr: string) => {
            try {
                // timeStr format: "08:00 - 08:40"
                const [startPart, endPart] = timeStr.split(' - ');
                const [startH, startM] = startPart.trim().split(':').map(Number);
                const [endH, endM] = endPart.trim().split(':').map(Number);

                const startTotal = (startH * 60) + startM;
                const endTotal = (endH * 60) + endM;

                if (currentTimeInMinutes < startTotal) return 'upcoming';
                if (currentTimeInMinutes >= startTotal && currentTimeInMinutes <= endTotal) return 'current';
                return 'done';
            } catch (e) {
                return 'upcoming';
            }
        };

        const timetable = allocations.slice(0, 5).map((a, i) => {
            const h = 8 + i;
            const hStart = h.toString().padStart(2, '0');
            const hEnd = h.toString().padStart(2, '0');
            const timeRange = `${hStart}:00 - ${hEnd}:40`;
            return {
                time: timeRange,
                program: programMap.get(a.programId) || "Unknown Program",
                course: a.courseId,
                status: getSlotStatus(timeRange)
            };
        });

        const data = {
            myStudentsCount: myStudents.length,
            programsAssigned,
            lessonsToday,
            avgPerformance,
            timetable
        };
        return { data, unauthorized: false };
    }
});

// === TEACHER PERFORMANCE INSIGHTS FOR HOD ===
export const getTeacherPerformanceDetails = query({
    args: {
        sessionId: v.optional(v.string()),
        lecturerId: v.id("users"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:faculties");
        if (unauthorized) return null;

        const [lecturer, allocations, slots, attendanceRecords, assessments] = await Promise.all([
            ctx.db.get(args.lecturerId),
            ctx.db
                .query("courseAllocations")
                .withIndex("by_lecturer_period", q => q.eq("lecturerId", args.lecturerId).eq("year", args.year).eq("semester", args.semester))
                .collect(),
            ctx.db
                .query("timeSlots")
                .withIndex("by_lecturer_period", q => q.eq("lecturerId", args.lecturerId).eq("semester", args.semester).eq("year", args.year))
                .collect(),
            ctx.db
                .query("attendance")
                .withIndex("by_lecturer_period", q => q.eq("lecturerId", args.lecturerId).eq("semester", args.semester).eq("year", args.year))
                .collect(),
            ctx.db
                .query("assessments")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect()
        ]);

        if (!lecturer) return null;

        // 1. Courses Taught (Unique list from allocations)
        const courses = Array.from(new Set(allocations.map(a => a.courseId)));

        // 2. Attendance Compliance
        const lessonsTaught = new Set(attendanceRecords.map(a => `${a.date}-${a.courseId}-${a.programId}`)).size;
        const expectedLessonsPerSemester = slots.length * 12;
        const complianceRate = expectedLessonsPerSemester > 0
            ? Math.min(100, Math.round((lessonsTaught / expectedLessonsPerSemester) * 100))
            : 0;

        // 3. Student Performance 
        const lecturerCoursePrograms = new Set(allocations.map(a => `${a.courseId}-${a.programId}`));
        const relevantAssessments = assessments.filter(a => lecturerCoursePrograms.has(`${a.courseId}-${a.programId}`));

        const avgScore = relevantAssessments.length > 0
            ? Math.round(relevantAssessments.reduce((sum, a) => sum + (a.finalScore || 0), 0) / relevantAssessments.length)
            : 0;

        const overallScore = Math.round((complianceRate * 0.4) + (avgScore * 0.6));

        // 5. Course Specific Breakdown
        const courseStats = await Promise.all(courses.map(async (crs) => {
            const crsAssessments = relevantAssessments.filter(a => a.courseId === crs);
            const crsAvg = crsAssessments.length > 0
                ? Math.round(crsAssessments.reduce((sum, a) => sum + (a.finalScore || 0), 0) / crsAssessments.length)
                : 0;

            return {
                course: crs,
                average: crsAvg,
                studentsCount: new Set(crsAssessments.map(a => a.studentId)).size
            };
        }));

        return {
            lecturerName: `${lecturer.firstName} ${lecturer.lastName}`,
            role: lecturer.role,
            avatarUrl: lecturer.avatarUrl,
            courses,
            analytics: {
                complianceRate,
                avgScore,
                overallScore,
                lessonsTaught,
                expectedLessons: expectedLessonsPerSemester
            },
            courseStats,
            recentPerformance: [
                { name: 'Attendance', value: complianceRate },
                { name: 'Academics', value: avgScore },
                { name: 'Overall', value: overallScore }
            ]
        };
    }
});

// === FACULTY ANALYTICS ===

export const getDepartmentAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        facultyId: v.id("faculties"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { unauthorized: true };

        const faculty = await ctx.db.get(args.facultyId);
        if (!faculty) return { unauthorized: false, error: "Faculty not found" };

        // Check effective capabilities + granular global overrides
        const hasGlobalAccess = userHasCapability(user, "access:faculties") ||
            userHasCapability(user, "master-data:manage_faculties");

        const isMember = user.facultyIds?.includes(args.facultyId);
        const isDean = faculty.deanId === user._id;

        if (!hasGlobalAccess && !isMember && !isDean) {
            return { unauthorized: true };
        }

        const facultyCourses = await ctx.db.query("courses").withIndex("by_faculty", q => q.eq("facultyId", args.facultyId)).collect();
        const facultyCourseIds = new Set(facultyCourses.map(c => c._id as string));

        // 1. Fetch Assignments and Allocations for these courses
        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", q => q.eq("year", args.year).eq("semester", args.semester))
            .collect();

        const relevantAllocations = allocations.filter(a => facultyCourseIds.has(a.courseId));
        const programIds = new Set(relevantAllocations.map(a => a.programId));

        // 2. Fetch Assessments for these courses
        const assessments = await ctx.db
            .query("assessments")
            .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
            .collect();

        const relevantAssessments = assessments.filter(a => a.courseId && facultyCourseIds.has(a.courseId));

        // 3. Overall Faculty Average
        const allMarks = relevantAssessments.map(a => a.finalScore || 0);
        const facultyAverage = allMarks.length > 0
            ? Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length)
            : 0;

        // 4. Pass Rate (Assuming >= 50 is pass)
        const passCount = allMarks.filter(m => m >= 50).length;
        const passRate = allMarks.length > 0
            ? Math.round((passCount / allMarks.length) * 100)
            : 0;

        // 5. Course Performance Comparison
        const coursePerformance = facultyCourses.map(crs => {
            const crsAssessments = relevantAssessments.filter(a => a.courseId === crs._id);
            const avg = crsAssessments.length > 0
                ? Math.round(crsAssessments.reduce((sum, a) => sum + (a.finalScore || 0), 0) / crsAssessments.length)
                : 0;
            return { course: crs.title, average: avg };
        }).sort((a, b) => b.average - a.average);

        const topCourse = coursePerformance.length > 0 ? coursePerformance[0] : null;

        return {
            facultyName: faculty.name,
            facultyAverage,
            passRate,
            topCourse,
            coursePerformance,
            totalStudents: new Set(relevantAssessments.map(a => a.studentId)).size,
            programsCount: programIds.size,
            unauthorized: false
        };
    }
});

// === DETAILED COURSE ANALYTICS FOR OVERSIGHT ===
export const getSubjectDetailedAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        allocationId: v.id("courseAllocations"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const allocation = await ctx.db.get(args.allocationId);
        if (!allocation) return { data: null, error: "Allocation not found" };

        const faculties = await ctx.db.query("faculties").collect();
        const userHeadedFaculties = faculties.filter(f => f.deanId === user._id);
        const course = await ctx.db.get(allocation.courseId as Id<"courses">);
        const isDean = userHeadedFaculties.some(f => f._id === course?.facultyId);
        
        const isAssigned = allocation.lecturerId === user._id;
        const isAdmin = userHasCapability(user, "access:faculties") || userHasCapability(user, "system:view_analytics");

        const prg = await ctx.db.get(allocation.programId);
        const isRegistrationOfficer = (prg as any)?.teacherId === user._id; // University equivalent or still 'teacherId' for program lead?

        if (!isDean && !isAssigned && !isAdmin && !isRegistrationOfficer) {
            return { unauthorized: true };
        }

        const GLOBAL_CONFIG_VAL = "__GLOBAL__" as Id<"courses">;

        const config = await ctx.db
            .query("assessmentConfigs")
            .withIndex("by_lecturer_course", (q) =>
                q.eq("lecturerId", allocation.lecturerId)
                    .eq("courseId", GLOBAL_CONFIG_VAL)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .first() || await ctx.db
                .query("assessmentConfigs")
                .withIndex("by_lecturer_course", (q) =>
                    q.eq("lecturerId", allocation.lecturerId)
                        .eq("courseId", allocation.courseId)
                        .eq("semester", args.semester)
                        .eq("year", args.year)
                )
                .first();

        const assessments = await ctx.db
            .query("assessments")
            .withIndex("by_program_period", (q) =>
                q.eq("programId", allocation.programId)
                    .eq("semester", args.semester)
            )
            .filter(q => q.and(
                q.eq(q.field("year"), args.year),
                q.eq(q.field("courseId"), allocation.courseId)
            ))
            .collect();

        const columns = config?.columns || [];
        const performanceTrend = columns.map(col => {
            const colAssessments = assessments.filter(a => (a as any).configColumnId === col.id && (a as any).marks !== undefined);
            const avg = colAssessments.length > 0
                ? Math.round(colAssessments.reduce((sum, a) => sum + ((a as any).marks || 0), 0) / colAssessments.length)
                : 0;
            return {
                label: col.label,
                average: avg,
                max: col.maxMarks,
            };
        });

        const attendanceRecords = await ctx.db
            .query("attendance")
            .withIndex("by_program_period", (q) => q.eq("programId", allocation.programId).eq("semester", args.semester))
            .filter(q =>
                q.and(
                    q.eq(q.field("year"), args.year),
                    q.eq(q.field("courseId"), allocation.courseId)
                )
            )
            .collect();

        const attendanceSummary = [
            { name: "Present", value: attendanceRecords.filter(r => r.status === "Present").length, color: "#10b981" },
            { name: "Absent", value: attendanceRecords.filter(r => r.status === "Absent").length, color: "#ef4444" },
            { name: "Late", value: attendanceRecords.filter(r => r.status === "Late").length, color: "#f59e0b" },
            { name: "Sick", value: attendanceRecords.filter(r => r.status === "Sick" || r.isSick).length, color: "#3b82f6" },
        ];

        return {
            data: {
                performanceTrend,
                attendanceSummary,
            },
            unauthorized: false
        };
    }
});

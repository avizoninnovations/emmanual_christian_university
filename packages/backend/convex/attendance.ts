// Attendance Module
// Daily attendance tracking with session auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUser, logAction, checkCapability, checkAnyCapability, userHasCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";
import { getStudentsForPeriod } from "./historyHelpers";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Sick"

// ===== GET ATTENDANCE RECORDS =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
        semester: v.number(),
        year: v.number(),
        studentId: v.optional(v.id("students")),
        programId: v.optional(v.id("programs")),
        date: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "attendance:manage");
        if (!user) return { data: [], unauthorized: true };

        let recordsQuery;

        if (args.studentId) {
            recordsQuery = ctx.db
                .query("attendance")
                .withIndex("by_student_period", (q) =>
                    q
                        .eq("studentId", args.studentId!)
                        .eq("semester", args.semester)
                        .eq("year", args.year)
                );
        } else if (args.programId && args.semester && args.year) {
            recordsQuery = ctx.db
                .query("attendance")
                .withIndex("by_program_period", (q) =>
                    q.eq("programId", args.programId!).eq("semester", args.semester).eq("year", args.year)
                );
        } else {
            recordsQuery = ctx.db
                .query("attendance")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester).eq("year", args.year)
                );

            if (args.programId) {
                recordsQuery = recordsQuery.filter((r) => r.eq(r.field("programId"), args.programId));
            }
        }

        const results = await recordsQuery.order("desc").paginate(args.paginationOpts);

        const studentIds = [...new Set(results.page.map(r => r.studentId))] as Id<"students">[];
        const students = await Promise.all(studentIds.map(id => ctx.db.get(id)));
        const studentMap = new Map(students.filter(Boolean).map(s => [s!._id, s]));

        const page = results.page.map((record) => {
            const student = studentMap.get(record.studentId);
            return {
                ...record,
                studentName: student
                    ? `${student.firstName} ${student.lastName}`
                    : "Unknown",
            };
        });

        return { ...results, page, unauthorized: false };
    },
});

export const getRegistryHub = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:attendance:register")
        if (!user) return { data: null, unauthorized: true }

        const records = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .filter((q) => q.eq(q.field("date"), args.date))
            .collect()

        const programIds = [...new Set(records.map((r) => r.programId).filter(Boolean))] as Id<"programs">[]
        const teacherIds = [...new Set(records.map((r) => r.lecturerId).filter(Boolean))] as Id<"users">[]

        const [programs, lecturers] = await Promise.all([
            Promise.all(programIds.map((id) => ctx.db.get(id))),
            Promise.all(teacherIds.map((id) => ctx.db.get(id))),
        ])

        const programMap = new Map(programs.filter(Boolean).map((p) => [p!._id, p!]))
        const lecturerMap = new Map(lecturers.filter(Boolean).map((l: any) => [l!._id, l!]))

        const makeCounts = () => ({
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            sick: 0,
        })

        const summary = makeCounts()

        const programBuckets = new Map<
            Id<"programs">,
            {
                programId: Id<"programs">
                programName: string
                counts: ReturnType<typeof makeCounts>
                courses: Map<
                    Id<"courses">,
                    {
                        courseId: Id<"courses">
                        counts: ReturnType<typeof makeCounts>
                        lastMarkedBy?: string
                    }
                >
            }
        >()

        const bump = (counts: ReturnType<typeof makeCounts>, status: AttendanceStatus) => {
            counts.total += 1
            if (status === "Present") counts.present += 1
            if (status === "Absent") counts.absent += 1
            if (status === "Late") counts.late += 1
            if (status === "Sick") counts.sick += 1
        }

        for (const r of records as any[]) {
            const status = r.status as AttendanceStatus
            bump(summary, status)

            const programDoc = r.programId ? programMap.get(r.programId) : null;
            const programName = programDoc ? programDoc.name : "Unknown";
            const courseId = r.courseId as Id<"courses">;
            const markedBy = r.lecturerId ? lecturerMap.get(r.lecturerId) : null;
            const markedByName = markedBy ? `${markedBy.firstName} ${markedBy.lastName}` : undefined;

            if (r.programId && !programBuckets.has(r.programId)) {
                programBuckets.set(r.programId, {
                    programId: r.programId,
                    programName,
                    counts: makeCounts(),
                    courses: new Map(),
                })
            }

            const programBucket = r.programId ? programBuckets.get(r.programId)! : null
            if (programBucket) bump(programBucket.counts, status)

            if (programBucket && !programBucket.courses.has(courseId)) {
                programBucket.courses.set(courseId, {
                    courseId: courseId,
                    counts: makeCounts(),
                })
            }

            const courseBucket = programBucket ? programBucket.courses.get(courseId)! : null
            if (courseBucket) {
                bump(courseBucket.counts, status)
                if (markedByName) courseBucket.lastMarkedBy = markedByName
            }
        }

        const programsOut = [...programBuckets.values()]
            .map((p) => ({
                programId: p.programId,
                programName: p.programName,
                counts: p.counts,
                courses: [...p.courses.values()],
            }))
            .sort((a, b) => a.programName.localeCompare(b.programName))

        const data = {
            date: args.date,
            semester: args.semester,
            year: args.year,
            summary,
            programs: programsOut,
        }

        return { data, unauthorized: false }
    },
})

export const getCoursesForProgram = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const hasAccess = userHasCapability(user, "access:attendance:register") || userHasCapability(user, "attendance:manage");

        if (!hasAccess) {
            // Allow if they are assigned to ANY course in this program
            const allocations = await ctx.db
                .query("courseAllocations")
                .withIndex("by_lecturer_period", (q) => 
                    q.eq("lecturerId", user._id)
                     .eq("year", args.year)
                     .eq("semester", args.semester)
                )
                .collect();

            // Filter for courses that are linked to this program
            const programCourses = await ctx.db.query("courses")
                .filter(q => q.neq(q.field("programIds"), undefined))
                .collect();
            
            const programCourseIds = new Set(programCourses
                .filter(c => c.programIds?.includes(args.programId))
                .map(c => c._id));

            const isAssigned = allocations.some(a => programCourseIds.has(a.courseId));

            if (!isAssigned) {
                return { data: [], unauthorized: true };
            }
        }

        const allocations = await ctx.db
            .query("courseAllocations")
            .withIndex("by_period", (q) => q.eq("year", args.year).eq("semester", args.semester))
            .collect()

        const attendanceRecords = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .filter((q) => q.eq(q.field("programId"), args.programId))
            .collect()

        const recordedCourseIds = attendanceRecords
            .map((r: any) => r.courseId)
            .filter(Boolean) as Id<"courses">[]

        const courses = [...new Set([
            ...allocations.map((a: any) => a.courseId).filter(Boolean),
            ...recordedCourseIds,
        ])]
        return { data: courses, unauthorized: false }
    },
})

export const getRegisterProgramCourse = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        date: v.string(),
        semester: v.number(),
        year: v.number(),
        courseId: v.optional(v.id("courses")),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const hasAccess = userHasCapability(user, "access:attendance:register") || userHasCapability(user, "attendance:manage");

        if (!hasAccess) {
            // Check if they are the assigned lecturer for this course
            if (args.courseId) {
                const allocation = await ctx.db
                    .query("courseAllocations")
                    .withIndex("by_lecturer_period", (q) =>
                        q.eq("lecturerId", user._id)
                         .eq("year", args.year)
                         .eq("semester", args.semester)
                    )
                    .filter(q => q.eq(q.field("courseId"), args.courseId))
                    .first();

                if (!allocation) {
                    return { data: null, unauthorized: true };
                }
            } else {
                // Dean of faculty? (Replacing Class Teacher concept)
                const faculty = await ctx.db.query("faculties")
                    .filter(q => q.eq(q.field("deanId"), user._id))
                    .first();
                
                if (!faculty) {
                    return { data: null, unauthorized: true };
                }
            }
        }

        const students = await getStudentsForPeriod(ctx, args.programId, args.semester, args.year);

        let recordsQuery = ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .filter((q) => q.eq(q.field("programId"), args.programId))
            .filter((q) => q.eq(q.field("date"), args.date))

        if (args.courseId) {
            recordsQuery = recordsQuery.filter((q) => q.eq(q.field("courseId"), args.courseId))
        } else {
            recordsQuery = recordsQuery.filter((q) => q.eq(q.field("courseId"), undefined))
        }

        const records = await recordsQuery.collect()
        const recordsMap = new Map(records.map((r: any) => [r.studentId, r]))

        const summary = {
            total: students.length,
            present: 0,
            absent: 0,
            late: 0,
            sick: 0,
        }

        const data = students
            .map((student: any) => {
                const record = recordsMap.get(student._id);
                const status = ((record as any)?.status || "Absent") as AttendanceStatus
                if (status === "Present") summary.present += 1
                if (status === "Absent") summary.absent += 1
                if (status === "Late") summary.late += 1
                if (status === "Sick") summary.sick += 1

                return {
                    studentId: student._id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    status,
                    reason: record?.reason,
                    hasRecord: !!record,
                }
            })
            .sort((a: any, b: any) => a.studentName.localeCompare(b.studentName))

        return {
            data: {
                summary,
                students: data,
            },
            unauthorized: false,
        }
    },
})

export const getSemesterAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:attendance:analytics")
        if (!user) return { data: null, unauthorized: true }

        const records = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .collect()

        const programIds = [...new Set(records.map((r: any) => r.programId).filter(Boolean))] as Id<"programs">[]
        const programs = await Promise.all(programIds.map((id) => ctx.db.get(id)))
        const programMap = new Map(programs.filter(Boolean).map((p) => [p!._id, p!]))

        const makeCounts = () => ({ total: 0, present: 0, absent: 0, late: 0, sick: 0 })
        const bump = (counts: ReturnType<typeof makeCounts>, status: AttendanceStatus) => {
            counts.total += 1
            if (status === "Present") counts.present += 1
            if (status === "Absent") counts.absent += 1
            if (status === "Late") counts.late += 1
            if (status === "Sick") counts.sick += 1
        }

        const summary = makeCounts()
        const programBuckets = new Map<Id<"programs">, { programId: Id<"programs">, programName: string, counts: ReturnType<typeof makeCounts> }>()

        for (const r of records as any[]) {
            const status = r.status as AttendanceStatus
            bump(summary, status)

            if (!r.programId) continue;
            const programDoc = programMap.get(r.programId)
            const programName = programDoc ? (programDoc as any).name : "Unknown"
            if (!programBuckets.has(r.programId)) {
                programBuckets.set(r.programId, { programId: r.programId, programName, counts: makeCounts() })
            }
            bump(programBuckets.get(r.programId)!.counts, status)
        }

        const programsOut = [...programBuckets.values()].sort((a, b) => a.programName.localeCompare(b.programName))
        const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0

        return {
            data: {
                semester: args.semester,
                year: args.year,
                summary: { ...summary, attendanceRate: rate },
                programs: programsOut,
            },
            unauthorized: false,
        }
    },
})

// ===== MARK ATTENDANCE (Batch) =====

export const markAttendance = mutation({
    args: {
        sessionId: v.optional(v.string()),
        records: v.array(
            v.object({
                studentId: v.id("students"),
                programId: v.id("programs"),
                courseId: v.id("courses"),
                date: v.string(),
                status: v.union(
                    v.literal("Present"),
                    v.literal("Absent"),
                    v.literal("Late"),
                    v.literal("Sick")
                ),
                reason: v.optional(v.string()),
                semester: v.number(),
                year: v.number(),
                lecturerId: v.optional(v.id("users")),
                slotId: v.optional(v.id("timeSlots")),
                isSick: v.optional(v.boolean()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { success: false, error: "Unauthorized" };

        const hasManagePerm = userHasCapability(user, "attendance:manage") || userHasCapability(user, "access:attendance:register");

        if (!hasManagePerm) {
            // Check if they are the assigned lecturer for ALL these records
            for (const record of args.records) {
                const allocation = await ctx.db
                    .query("courseAllocations")
                    .withIndex("by_lecturer_period", (q) =>
                        q.eq("lecturerId", user._id)
                         .eq("year", record.year)
                         .eq("semester", record.semester)
                    )
                    .filter(q => q.eq(q.field("courseId"), record.courseId))
                    .first();

                if (!allocation) {
                    return { success: false, error: "You don't have permission to mark attendance for this course." };
                }
            }
        }

        for (const record of args.records) {
            // Find existing record for this student, course, date AND slot (if provided)
            const existing = await ctx.db
                .query("attendance")
                .withIndex("by_student_date", (q) =>
                    q.eq("studentId", record.studentId).eq("date", record.date)
                )
                .filter((q) =>
                    q.and(
                        q.eq(q.field("programId"), record.programId),
                        q.and(
                            q.eq(q.field("courseId"), record.courseId),
                            q.eq(q.field("slotId"), record.slotId)
                        )
                    )
                )
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    status: record.status,
                    isSick: record.isSick,
                    reason: record.reason,
                    lecturerId: record.lecturerId || user._id, // Update lecturer
                });
            } else {
                await ctx.db.insert("attendance", {
                    ...record,
                    lecturerId: record.lecturerId || user._id, // Track who marked it
                });
            }
        }

        await logAction(
            ctx,
            user._id,
            "MARK_ATTENDANCE",
            `Marked ${args.records.length} students`
        );

        return { success: true, count: args.records.length };
    },
});

// ===== GET ATTENDANCE SUMMARY =====

export const getSummary = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "attendance:manage");
        if (!user) return { data: null, unauthorized: true };

        const records = await ctx.db
            .query("attendance")
            .withIndex("by_student_period", (q) =>
                q
                    .eq("studentId", args.studentId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .collect();

        const total = records.length;
        const present = records.filter((r) => r.status === "Present").length;
        const absent = records.filter((r) => r.status === "Absent").length;
        const late = records.filter((r) => r.status === "Late").length;
        const sick = records.filter((r) => r.status === "Sick").length;

        const rate = total > 0 ? Math.round((present / total) * 100) : 100;

        const data = {
            total,
            present,
            absent,
            late,
            sick,
            attendanceRate: rate,
        };

        return { data, unauthorized: false };
    },
});

// ===== GET CLASS ATTENDANCE FOR DATE =====

export const getClassAttendanceForDate = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        date: v.string(),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
        courseId: v.optional(v.id("courses")),
        slotId: v.optional(v.id("timeSlots")),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const hasManagePerm = userHasCapability(user, "attendance:manage") || userHasCapability(user, "access:attendance:register");

        if (!hasManagePerm) {
            // Check if they are the assigned lecturer for this course
            if (args.courseId) {
                const allocation = await ctx.db
                    .query("courseAllocations")
                    .withIndex("by_lecturer_period", (q) =>
                        q.eq("lecturerId", user._id)
                         .eq("year", args.year ?? new Date().getFullYear())
                         .eq("semester", args.semester ?? 1)
                    )
                    .filter(q => q.eq(q.field("courseId"), args.courseId))
                    .first();

                if (!allocation) {
                    return { data: [], unauthorized: true };
                }
            } else {
                // Faculty-level access?
                const faculty = await ctx.db.query("faculties")
                    .filter(q => q.eq(q.field("deanId"), user._id))
                    .first();
                
                if (!faculty) {
                    return { data: [], unauthorized: true };
                }
            }
        }

        let semester = args.semester;
        let year = args.year;
        
        if (semester === undefined || year === undefined) {
             const config = await ctx.db.query("schoolConfig").first();
             semester = config?.currentSemester || 1;
             year = config?.currentYear || new Date().getFullYear();
        }

        const students = await getStudentsForPeriod(ctx, args.programId, semester, year);

        let recordsQuery = ctx.db
            .query("attendance")
            .withIndex("by_period", (q) =>
                q.eq("semester", semester).eq("year", year)
            )
            .filter((q) => q.eq(q.field("programId"), args.programId))
            .filter((q) => q.eq(q.field("date"), args.date));

        if (args.courseId) {
            recordsQuery = recordsQuery.filter(q => q.eq(q.field("courseId"), args.courseId));
        }

        if (args.slotId) {
            recordsQuery = recordsQuery.filter(q => q.eq(q.field("slotId"), args.slotId));
        }

        const records = await recordsQuery.collect();
        const recordsMap = new Map(records.map(r => [r.studentId, r]));

        const data = students.map((student) => {
            const record = recordsMap.get(student._id);

            return {
                studentId: student._id,
                studentName: `${student.firstName} ${student.lastName}`,
                status: record?.status || "Absent",
                isSick: record?.isSick || record?.status === "Sick", // Backwards compatibility
                notes: record?.reason,
                hasRecord: !!record,
            };
        });

        return { data, unauthorized: false };
    },
});

// ===== DELETE ATTENDANCE RECORD =====

export const deleteRecord = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("attendance"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "attendance:manage");
        if (!user) return { success: false, error: "You don't have permission to delete attendance records." };

        await ctx.db.delete(args.id);

        await logAction(ctx, user._id, "DELETE_ATTENDANCE", `Deleted: ${args.id}`);

        return { success: true };
    },
});

export const getVerificationData = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        courseId: v.id("courses"),
        startDate: v.string(), // ISO String YYYY-MM-DD
        endDate: v.string(), // ISO String YYYY-MM-DD
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const hasAccess = userHasCapability(user, "attendance:manage") ||
            userHasCapability(user, "access:attendance:analytics") ||
            userHasCapability(user, "access:attendance:register");

        if (!hasAccess) {
            // Check if they are the assigned lecturer for this course
            const allocation = await ctx.db
                .query("courseAllocations")
                .withIndex("by_lecturer_period", (q) =>
                    q.eq("lecturerId", user._id)
                     .eq("year", args.year)
                     .eq("semester", args.semester)
                )
                .filter(q => q.eq(q.field("courseId"), args.courseId))
                .first();

            if (!allocation) {
                return { data: null, unauthorized: true };
            }
        }

        // 1. Get Timetable Slots for this course/program
        const slots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", (q) =>
                q.eq("programId", args.programId)
                    .eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .filter((q) => q.eq(q.field("courseId"), args.courseId))
            .collect();

        // 2. Get Attendance Records for the date range
        const attendanceRecords = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester)
                    .eq("year", args.year)
            )
            .filter((q) =>
                q.and(
                    q.eq(q.field("programId"), args.programId),
                    q.eq(q.field("courseId"), args.courseId),
                    q.gte(q.field("date"), args.startDate),
                    q.lte(q.field("date"), args.endDate)
                )
            )
            .collect();

        // 3. Generate Calendar Structure
        const start = new Date(args.startDate);
        const end = new Date(args.endDate);
        const days: any[] = [];

        // Helper to format date as YYYY-MM-DD
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        let current = new Date(start);
        while (current <= end) {
            const dateStr = formatDate(current);
            const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });

            // Find slots scheduled for this day name
            const daySlots = slots.filter(s => s.day === dayName).sort((a, b) => a.startTime.localeCompare(b.startTime));

            const periods = await Promise.all(daySlots.map(async (slot) => {
                // Find attendance for this specific slot/date
                const recordsForSlot = attendanceRecords.filter(r =>
                    r.date === dateStr && (r.slotId === slot._id)
                );

                // If no records found by slotId, try legacy match by date (if strict slot tracking wasn't used before)
                // But for verification, let's rely on strict marking presence.
                // If records exist, it's "Marked". If not, it's "Missing".

                const isMarked = recordsForSlot.length > 0;

                let stats = { present: 0, absent: 0, late: 0, sick: 0, total: 0 };
                if (isMarked) {
                    stats.total = recordsForSlot.length;
                    recordsForSlot.forEach(r => {
                        if (r.status === "Present") stats.present++;
                        if (r.status === "Absent") stats.absent++;
                        if (r.status === "Late") stats.late++;
                        if (r.status === "Sick" || r.isSick) stats.sick++; // Count sick regardless of status label if isSick is true
                    });
                }

                const lecturer = slot.lecturerId ? await ctx.db.get(slot.lecturerId) : null;
                const lecturerName = lecturer ? `${(lecturer as any).firstName} ${(lecturer as any).lastName}` : "No Lecturer Assigned";

                return {
                    slotId: slot._id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    room: slot.room,
                    isMarked,
                    stats,
                    lecturerId: slot.lecturerId, // Scheduled lecturer
                    lecturerName
                };
            }));

            if (periods.length > 0) {
                days.push({
                    date: dateStr,
                    dayName,
                    periods
                });
            }

            current.setDate(current.getDate() + 1);
        }

        // 4. Summarize
        let totalScheduled = 0;
        let totalMarked = 0;
        let totalMissed = 0;

        days.forEach(day => {
            day.periods.forEach((p: any) => {
                totalScheduled++;
                if (p.isMarked) totalMarked++;
                else totalMissed++;
            });
        });

        return {
            data: {
                calendar: days,
                summary: {
                    totalScheduled,
                    totalMarked,
                    totalMissed
                }
            },
            unauthorized: false
        };
    },
});

export const getSubjectDailyAttendanceStatus = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        courseId: v.id("courses"),
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, args) => {
        // Authorization: Oversight, Analytics, OR the Lecturer
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const isAdmin = userHasCapability(user, "access:attendance:analytics") || 
                        userHasCapability(user, "access:oversight:dos") || 
                        userHasCapability(user, "access:timetable:manage") || 
                        userHasCapability(user, "access:faculties");

        // Faculty/Dean Check
        const faculty = await ctx.db.query("faculties")
            .filter(q => q.eq(q.field("deanId"), user._id))
            .first();
        const IsDean = !!faculty;

        // Assigned Lecturer Check
        const config = await ctx.db.query("schoolConfig").first();
        const semester = config?.currentSemester || 1;
        const year = config?.currentYear || new Date().getFullYear();

        const allocation = await ctx.db
            .query("courseAllocations")
            .withIndex("by_lecturer_period", (q) =>
                q.eq("lecturerId", user._id)
                 .eq("year", year)
                 .eq("semester", semester)
            )
            .filter(q => q.eq(q.field("courseId"), args.courseId))
            .first();
        const isLecturer = !!allocation;

        if (!isAdmin && !IsDean && !isLecturer) {
            return { data: [], unauthorized: true };
        }

        // 1. Get Scheduled Day Name safely
        const [y, m, d] = args.date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = weekdays[dateObj.getDay()];

        // 2. Get Scheduled Slots for this specific day name
        const slots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", (q) => q.eq("programId", args.programId).eq("semester", semester).eq("year", year))
            .filter((q) => q.eq(q.field("day"), dayName))
            .filter((q) => q.eq(q.field("courseId"), args.courseId))
            .collect();

        // 3. Map to Status (Taken/Not Taken)
        const lessonStatus = await Promise.all(slots.map(async (slot) => {
            // Check if ANY record exists for this date and slotId
            const records = await ctx.db
                .query("attendance")
                .withIndex("by_course_date", (q) => q.eq("courseId", args.courseId).eq("date", args.date))
                .filter((q) => q.eq(q.field("slotId"), slot._id))
                .collect();

            const isMarked = records.length > 0;
            let markedBy = null;
            if (isMarked && records[0].lecturerId) {
                const lecturer = await ctx.db.get(records[0].lecturerId);
                markedBy = lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : "Unknown Lecturer";
            }

            const assignedLecturer = slot.lecturerId ? await ctx.db.get(slot.lecturerId) : null;
            const assignedLecturerName = assignedLecturer ? `${assignedLecturer.firstName} ${assignedLecturer.lastName}` : "No Lecturer Assigned";

            // Determine Status: TAKEN, NOT TAKEN, or MISSED (if time passed)
            let status: "TAKEN" | "NOT TAKEN" | "MISSED" = "NOT TAKEN";

            // CONVEX RUNS IN UTC. Sudan is UTC+3.
            // We need to compare local school time.
            const nowUTC = new Date();
            const sudanOffset = 3 * 60 * 60 * 1000;
            const nowSudan = new Date(nowUTC.getTime() + sudanOffset);
            const todayStrSudan = nowSudan.toISOString().split('T')[0];

            // Timing checks
            const [startH, startM] = slot.startTime.split(":").map(Number);
            const [endH, endM] = slot.endTime.split(":").map(Number);

            const startTimeSudan = new Date(y, m - 1, d, startH, startM);
            const lockTimeSudan = new Date(y, m - 1, d, endH, endM + 20);

            const isBeforeStart = nowSudan < startTimeSudan;
            const isLockExpired = nowSudan > lockTimeSudan;

            if (isMarked) {
                status = "TAKEN";
            } else {
                // Only mark as MISSED if the date is in the past or the lock has expired today
                if (args.date < todayStrSudan || (args.date === todayStrSudan && isLockExpired)) {
                    status = "MISSED";
                }
            }

            // canMark logic: 
            // 1. Must be today (Sudan time)
            // 2. If it's NOT marked, it must have started (prevent early first-time marking)
            // 3. If it IS marked, we allow editing until the lock expires (regardless of start time)
            // 4. Must not have expired (20min after end)
            const canMark = args.date === todayStrSudan &&
                (isMarked || !isBeforeStart) &&
                !isLockExpired;

            return {
                _id: slot._id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                courseId: slot.courseId,
                isMarked,
                status,
                canMark,
                markedBy,
                assignedLecturerName,
                recordCount: records.length,
            };
        }));

        return { data: lessonStatus.sort((a, b) => a.startTime.localeCompare(b.startTime)), unauthorized: false };
    }
});

export const getSubjectDailyAttendanceStatusDebug = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        date: v.string(),
    },
    handler: async (ctx, args) => {
        // Authorization: Oversight, Analytics, OR the Lecturer
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { slots: [], unauthorized: true, dayName: "", date: args.date };

        const isAdmin = userHasCapability(user, "access:attendance:analytics") || userHasCapability(user, "access:oversight:dos") || userHasCapability(user, "access:timetable:manage");

        if (!isAdmin) {
             const config = await ctx.db.query("schoolConfig").first();
             const semester = config?.currentSemester || 1;
             const year = config?.currentYear || new Date().getFullYear();
             
             const allocation = await ctx.db
                .query("courseAllocations")
                .withIndex("by_lecturer_period", (q) => q.eq("lecturerId", user._id).eq("year", year).eq("semester", semester))
                .first();
             if (!allocation) {
                return { slots: [], unauthorized: true, dayName: "", date: args.date };
             }
        }

        const [y, m, d] = args.date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = weekdays[dateObj.getDay()];

        const config = await ctx.db.query("schoolConfig").first();
        const semester = config?.currentSemester || 1;
        const year = config?.currentYear || new Date().getFullYear();

        const slots = await ctx.db
            .query("timeSlots")
            .withIndex("by_program_period", (q) => q.eq("programId", args.programId).eq("semester", semester).eq("year", year))
            .filter((q) => q.eq(q.field("day"), dayName))
            .collect();

        return { slots, dayName, date: args.date };
    }
});
export const getSubjectCumulativeAttendance = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
        courseId: v.id("courses"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: [], unauthorized: true };

        const isAdmin = userHasCapability(user, "access:attendance:analytics") || userHasCapability(user, "access:oversight:dos");
        const faculty = await ctx.db.query("faculties").filter(q => q.eq(q.field("deanId"), user._id)).first();
        const isDean = !!faculty;

        const allocation = await ctx.db
            .query("courseAllocations")
            .withIndex("by_lecturer_period", (q) =>
                q.eq("lecturerId", user._id)
                 .eq("year", args.year)
                 .eq("semester", args.semester)
            )
            .filter(q => q.eq(q.field("courseId"), args.courseId))
            .first();
        const isLecturer = !!allocation;

        if (!isAdmin && !isDean && !isLecturer) {
            return { data: [], unauthorized: true };
        }


        const students = await getStudentsForPeriod(ctx, args.programId, args.semester, args.year);
        const attendanceRecords = await ctx.db
            .query("attendance")
            .withIndex("by_period", (q) => q.eq("semester", args.semester).eq("year", args.year))
            .filter((q) =>
                q.and(
                    q.eq(q.field("programId"), args.programId),
                    q.eq(q.field("courseId"), args.courseId)
                )
            )
            .collect();

        const studentMap = new Map();
        students.forEach(s => {
            studentMap.set(s._id, {
                studentName: `${s.firstName} ${s.lastName}`,
                present: 0,
                absent: 0,
                late: 0,
                sick: 0,
                total: 0
            });
        });

        attendanceRecords.forEach(r => {
            const stats = studentMap.get(r.studentId);
            if (stats) {
                stats.total++;
                if (r.status === "Present") stats.present++;
                if (r.status === "Absent") stats.absent++;
                if (r.status === "Late") stats.late++;
                if (r.status === "Sick" || r.isSick) stats.sick++;
            }
        });

        const data = Array.from(studentMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
        return { data, unauthorized: false };
    },
});

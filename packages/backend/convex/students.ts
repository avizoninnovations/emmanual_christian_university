//  Students Module (University Grade)
// CRUD operations for university student management

import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, checkAnyCapability, userHasCapability } from "./authHelpers";
import { paginationOptsValidator } from "convex/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ===== GET TOTAL COUNT =====

export const getTotalCount = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.optional(v.id("programs")),
        statuses: v.optional(v.array(v.string())),
        searchTerm: v.optional(v.string()),
        searchMode: v.optional(v.union(v.literal("name"), v.literal("registrationNumber"), v.literal("studentNumber"))),
        year: v.optional(v.number()),
        semester: v.optional(v.number()),
        gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { data: 0, unauthorized: true };

        // HISTORICAL CHECK
        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const currentYear = schoolConfig?.currentYear || new Date().getFullYear();
        const currentSemester = schoolConfig?.currentSemester || 1;

        const isHistorical = (args.year && args.year !== currentYear) || (args.semester && args.semester !== currentSemester);

        if (isHistorical && args.year && args.semester) {
            const historyRecords = await ctx.db
                .query("studentSemesterEnrollments")
                .withIndex("by_period", q => q.eq("semester", args.semester!).eq("year", args.year!))
                .collect();
            
            if (historyRecords.length > 0) {
                if (args.programId) {
                    const filtered = historyRecords.filter(h => h.programId === args.programId);
                    return { data: new Set(filtered.map(h => h.studentId)).size, unauthorized: false };
                }
                return { data: new Set(historyRecords.map(h => h.studentId)).size, unauthorized: false };
            }
        }

        let targetStatuses: string[] = ["Active"];
        if (args.statuses && args.statuses.length > 0) {
            targetStatuses = args.statuses;
        }

        const applyStatusFilter = (q: any) => {
            if (targetStatuses.length > 0 && !targetStatuses.includes("ALL")) {
                return q.filter((q: any) => {
                    if (targetStatuses.length === 1) {
                        return q.eq(q.field("status"), targetStatuses[0]);
                    }
                    return q.or(...targetStatuses.map(s => q.eq(q.field("status"), s)));
                });
            }
            return q;
        };

        let q;
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            const searchTerm = args.searchTerm.trim();
            if (args.searchMode === "registrationNumber") {
                const indexQ = ctx.db.query("students").withIndex("by_reg_number", q => q.eq("registrationNumber", searchTerm));
                const programFiltered = args.programId ? indexQ.filter(qb => qb.eq(qb.field("programId"), args.programId)) : indexQ;
                q = applyStatusFilter(programFiltered);
            } else if (args.searchMode === "studentNumber") {
                const indexQ = ctx.db.query("students").withIndex("by_student_number", q => q.eq("studentNumber", searchTerm));
                const programFiltered = args.programId ? indexQ.filter(qb => qb.eq(qb.field("programId"), args.programId)) : indexQ;
                q = applyStatusFilter(programFiltered);
            } else {
                const searchQ = ctx.db.query("students").withSearchIndex("search_name", q => q.search("fullName", searchTerm));
                const programFiltered = args.programId ? searchQ.filter(qb => qb.eq(qb.field("programId"), args.programId)) : searchQ;
                q = applyStatusFilter(programFiltered);
            }
        } else if (args.programId) {
            const indexQ = ctx.db.query("students").withIndex("by_program", q => q.eq("programId", args.programId!));
            q = applyStatusFilter(indexQ);
        } else if (targetStatuses.length === 1 && targetStatuses[0] !== "ALL") {
            q = ctx.db.query("students").withIndex("by_status", q => q.eq("status", targetStatuses[0] as any));
        } else {
            const baseQ = ctx.db.query("students");
            q = applyStatusFilter(baseQ);
        }

        if (args.gender) {
            q = q.filter((qb: any) => qb.eq(qb.field("gender"), args.gender));
        }

        const results = await q.collect();
        return { data: results.length, unauthorized: false };
    }
});

// ===== GET STUDENTS (PAGINATED) =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.optional(v.id("programs")),
        statuses: v.optional(v.array(v.string())),
        status: v.optional(v.string()), // Backward compatibility
        searchTerm: v.optional(v.string()),
        searchMode: v.optional(v.union(v.literal("name"), v.literal("registrationNumber"), v.literal("studentNumber"))),
        enrolledBefore: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
        gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
        year: v.optional(v.number()),
        semester: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        const caps = user.capabilities || [];
        const requestedStatuses = args.statuses && args.statuses.length > 0 ? args.statuses : (args.status ? [args.status] : ["Active"]);
        const isInactiveRequest = requestedStatuses.some(s => ["Alumni", "Graduated", "Discontinued", "Suspended"].includes(s));
        const requiredViewCap = isInactiveRequest ? "access:students:inactive" : "access:students:active";

        const canAccess = caps.includes("access:students") || caps.includes(requiredViewCap);
        if (!canAccess) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        // HISTORICAL CHECK
        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const currentYear = schoolConfig?.currentYear || new Date().getFullYear();
        const currentSemester = schoolConfig?.currentSemester || 1;

        const isHistorical = (args.year && args.year !== currentYear) || (args.semester && args.semester !== currentSemester);

        if (isHistorical && args.year && args.semester) {
            let historyRecords = await ctx.db
                .query("studentSemesterEnrollments")
                .withIndex("by_period", q => q.eq("semester", args.semester!).eq("year", args.year!))
                .collect();

            if (args.programId) {
                historyRecords = historyRecords.filter((h: any) => h.programId === args.programId);
            }

            const studentIds = [...new Set(historyRecords.map(h => h.studentId))];
            const rawStudents = await Promise.all(studentIds.map(id => ctx.db.get(id)));
            const studentMap = new Map(rawStudents.filter(Boolean).map(s => [s!._id, s]));

            const students = historyRecords.map((h: any) => {
                const s = studentMap.get(h.studentId) as any;
                if (!s) return null;
                return { ...s, programId: h.programId, _isHistorical: true };
            }).filter(Boolean);

            let filteredStudents = students;
            if (args.searchTerm) {
                const term = args.searchTerm.toLowerCase();
                filteredStudents = filteredStudents.filter((s: any) =>
                    s.firstName.toLowerCase().includes(term) || s.lastName.toLowerCase().includes(term) || s.registrationNumber?.toLowerCase().includes(term)
                );
            }

            const LIMIT = args.paginationOpts.numItems || 20;
            const cursor = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor) : 0;
            const pageSlice = filteredStudents.slice(cursor, cursor + LIMIT);
            const isDone = cursor + LIMIT >= filteredStudents.length;

            return {
                page: pageSlice,
                continueCursor: isDone ? "" : (cursor + LIMIT).toString(),
                isDone,
                unauthorized: false
            };
        }

        // Filtering Logic
        let targetStatuses: string[] = ["Active"];
        if (args.statuses && args.statuses.length > 0) targetStatuses = args.statuses;
        else if (args.status) targetStatuses = [args.status];

        const applyStatusFilter = (q: any) => {
            if (targetStatuses.length > 0 && !targetStatuses.includes("ALL")) {
                return q.filter((q: any) => {
                    const conditions = targetStatuses.map(s => q.eq(q.field("status"), s));
                    return targetStatuses.length === 1 ? conditions[0] : q.or(...conditions);
                });
            }
            return q;
        };

        let result;
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            const term = args.searchTerm.trim();
            let q;
            if (args.searchMode === "registrationNumber") q = ctx.db.query("students").withIndex("by_reg_number", q => q.eq("registrationNumber", term));
            else if (args.searchMode === "studentNumber") q = ctx.db.query("students").withIndex("by_student_number", q => q.eq("studentNumber", term));
            else q = ctx.db.query("students").withSearchIndex("search_name", q => q.search("fullName", term));

            if (args.programId) q = q.filter(qb => qb.eq(qb.field("programId"), args.programId));
            result = await applyStatusFilter(q).paginate(args.paginationOpts);
        } else if (args.programId) {
            result = await applyStatusFilter(ctx.db.query("students").withIndex("by_program", q => q.eq("programId", args.programId!))).order("desc").paginate(args.paginationOpts);
        } else if (targetStatuses.length === 1 && targetStatuses[0] !== "ALL") {
            result = await applyStatusFilter(ctx.db.query("students").withIndex("by_status", q => q.eq("status", targetStatuses[0] as any))).order("desc").paginate(args.paginationOpts);
        } else {
            result = await applyStatusFilter(ctx.db.query("students")).order("desc").paginate(args.paginationOpts);
        }

        // Enrich Data
        const programIds = [...new Set((result.page as any[]).map(s => s.programId).filter(Boolean))] as Id<"programs">[];
        const programs = await Promise.all(programIds.map(id => ctx.db.get(id)));
        const programMap = new Map(programs.filter(Boolean).map(p => [p!._id, p]));

        // Fetch Fee Structures
        const semester = args.semester || currentSemester;
        const feeStructures = await Promise.all(programIds.map(async (pid) => {
            return await ctx.db.query("feeStructures")
                .withIndex("by_program_semester", q => q.eq("programId", pid as any).eq("semesterNumber", semester))
                .first();
        }));
        const feeMap = new Map(feeStructures.filter(Boolean).map(f => [f!.programId as any, f]));

        const enrichedPage = (result.page as any[]).map(student => {
            const program = student.programId ? programMap.get(student.programId) : null;
            const structure = student.programId ? feeMap.get(student.programId) : null;
            return {
                ...student,
                programName: program?.name || "Unassigned",
                programCode: program?.code || "",
                totalDue: (student.balance || 0) + (structure?.total || 0),
            };
        });

        return { ...result, page: enrichedPage, unauthorized: false };
    },
});

// ===== GET BY ID =====

export const getById = query({
    args: { sessionId: v.optional(v.string()), id: v.id("students") },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { data: null, unauthorized: true };

        const student = await ctx.db.get(args.id);
        if (!student) return { data: null, unauthorized: false };

        const program = student.programId ? await ctx.db.get(student.programId) : null;
        const historySnapshots = await ctx.db.query("studentSemesterSnapshots")
            .withIndex("by_student_period", q => q.eq("studentId", args.id))
            .collect();
        
        // Enrich academic history with program names
        const enrichedHistory = await Promise.all(historySnapshots.map(async (h) => {
            const prog = await ctx.db.get(h.programId);
            return {
                semester: h.semester,
                year: h.year,
                programId: h.programId,
                programName: prog?.name || "Unknown Program",
                status: h.status,
                grade: "PR" // Placeholder for Progressing, could be fetched from assessments
            };
        }));

        // Fetch emergency contact
        const emergencyContact = student.emergencyContactId 
            ? await ctx.db.get(student.emergencyContactId) 
            : null;
        
        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const currentSemester = schoolConfig?.currentSemester || 1;
        const feeStructure = student.programId ? await ctx.db.query("feeStructures")
            .withIndex("by_program_semester", q => q.eq("programId", student.programId as any).eq("semesterNumber", currentSemester))
            .first() : null;

        return {
            data: {
                ...student,
                program: program ? { id: program._id, name: program.name, code: program.code } : null,
                programName: program?.name || "",
                emergencyContact: emergencyContact ? {
                    _id: emergencyContact._id,
                    name: emergencyContact.name,
                    relationship: emergencyContact.relationship,
                    contact: emergencyContact.contact,
                    email: emergencyContact.email,
                } : null,
                academicHistory: enrichedHistory,
                totalDue: (student.balance || 0) + (feeStructure?.total || 0),
            },
            unauthorized: false
        };
    },
});

// ===== STUDENT PORTAL DATA =====

export const getStudentPortalData = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        // 1. Link to Student record
        const student = await ctx.db
            .query("students")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
        
        if (!student) return { data: null, unauthorized: false, noStudentLink: true };

        // 2. Fetch Program details
        const program = student.programId ? await ctx.db.get(student.programId) : null;

        // 3. Academic Progression (History)
        const historySnapshots = await ctx.db
            .query("studentSemesterSnapshots")
            .withIndex("by_student_period", (q) => q.eq("studentId", student._id))
            .collect();
        
        const enrichedHistory = await Promise.all(historySnapshots.map(async (h) => {
            const prog = await ctx.db.get(h.programId);
            return {
                semester: h.semester,
                year: h.year,
                programName: prog?.name || "Unknown Program",
                status: h.status,
            };
        }));

        // 4. Financial Status
        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const currentSemester = schoolConfig?.currentSemester || 1;
        
        const feeStructure = student.programId ? await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", (q) => q.eq("programId", student.programId as any).eq("semesterNumber", currentSemester))
            .first() : null;

        const recentPayments = await ctx.db
            .query("payments")
            .withIndex("by_student", (q) => q.eq("studentId", student._id))
            .order("desc")
            .take(5);

        return {
            data: {
                studentInfo: {
                    ...student,
                    fullName: `${student.firstName} ${student.lastName}`,
                },
                program: program ? {
                    name: program.name,
                    code: program.code,
                    awardType: program.awardType,
                } : null,
                academicHistory: enrichedHistory,
                financials: {
                    balance: student.balance,
                    currentSemesterFees: feeStructure?.total || 0,
                    totalDue: (student.balance || 0) + (feeStructure?.total || 0),
                    recentPayments,
                }
            },
            unauthorized: false
        };
    },
});

// ===== GET FINANCE DETAIL =====

export const getFinanceDetail = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { financeSummary: null, paymentHistory: [], unauthorized: true };

        const student = await ctx.db.get(args.studentId);
        if (!student) return { financeSummary: null, paymentHistory: [], unauthorized: false };

        // 1. Get Fee Structure for this semester
        const feeStructure = await ctx.db.query("feeStructures")
            .withIndex("by_program_semester", q => q.eq("programId", student.programId as any).eq("semesterNumber", args.semester))
            .first();

        // 2. Get Payments for this semester
        const payments = await ctx.db.query("payments")
            .withIndex("by_student_period", q => q.eq("studentId", args.studentId).eq("semester", args.semester).eq("year", args.year))
            .collect();

        const totalPaidThisSemester = payments.reduce((sum, p) => sum + p.amount, 0);
        const currentSemesterFees = feeStructure?.total || 0;
        const totalBalance = student.balance || 0;

        const financeSummary = {
            currentSemesterFees,
            totalPaidThisSemester,
            previousBalance: Math.max(0, totalBalance - (currentSemesterFees - totalPaidThisSemester)),
            totalOwed: totalBalance,
        };

        const paymentHistory = payments.map(p => ({
            id: p._id,
            date: new Date(p.date || Date.now()).toLocaleDateString(),
            receiptNumber: p.receiptNumber,
            method: p.method,
            amount: p.amount,
        }));

        return { financeSummary, paymentHistory, unauthorized: false };
    }
});

// ===== CREATE STUDENT =====

export const create = mutation({
    args: {
        sessionId: v.optional(v.string()),
        firstName: v.string(),
        lastName: v.string(),
        gender: v.union(v.literal("Male"), v.literal("Female")),
        dateOfBirth: v.string(),
        enrollmentDate: v.string(),
        programId: v.id("programs"),
        avatarUrl: v.optional(v.string()),
        status: v.optional(v.string()),
        balance: v.optional(v.number()),
        registrationNumber: v.optional(v.string()),
        studentNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:active:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const currentSemester = schoolConfig?.currentSemester || 1;
        const currentYear = schoolConfig?.currentYear || new Date().getFullYear();

        let effectiveBalance = args.balance ?? 0;
        if (effectiveBalance === 0) {
            const feeStructure = await ctx.db.query("feeStructures")
                .withIndex("by_program_semester", q => q.eq("programId", args.programId as any).eq("semesterNumber", currentSemester))
                .first();
            effectiveBalance = feeStructure?.total || 0;
        }

        const studentId = await ctx.db.insert("students", {
            firstName: args.firstName,
            lastName: args.lastName,
            fullName: `${args.firstName} ${args.lastName}`.trim(),
            gender: args.gender,
            dateOfBirth: args.dateOfBirth,
            enrollmentDate: args.enrollmentDate,
            programId: args.programId,
            avatarUrl: args.avatarUrl,
            status: (args.status as any) || "Active",
            balance: effectiveBalance,
            registrationNumber: args.registrationNumber,
            studentNumber: args.studentNumber,
            intakeSemester: currentSemester,
            intakeYear: currentYear,
        });

        // Initialize Semester Enrollment
        if ((args.status || "Active") === "Active") {
            await ctx.db.insert("studentSemesterEnrollments", {
                studentId,
                programId: args.programId,
                semester: currentSemester,
                year: currentYear,
                status: "Active",
                dateEnrolled: args.enrollmentDate,
            });
        }

        await logAction(ctx, user._id, "CREATE_STUDENT", `Created student: ${args.firstName} ${args.lastName}`);
        return { success: true, studentId };
    },
});

// ===== UPDATE STUDENT =====

export const update = mutation({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("students"),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
        programId: v.optional(v.id("programs")),
        balance: v.optional(v.number()),
        status: v.optional(v.union(v.literal("Active"), v.literal("Suspended"), v.literal("Discontinued"), v.literal("Alumni"), v.literal("Graduated"))),
        avatarUrl: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        enrollmentDate: v.optional(v.string()),
        registrationNumber: v.optional(v.string()),
        studentNumber: v.optional(v.string()),
        cgpa: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:active:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const student = await ctx.db.get(args.id);
        if (!student) return { success: false, error: "Student not found" };

        const { sessionId, id, ...updates } = args;

        if (updates.firstName || updates.lastName) {
            const first = updates.firstName ?? student.firstName;
            const last = updates.lastName ?? student.lastName;
            (updates as any).fullName = `${first} ${last}`.trim();
        }

        // Handle Program Transfer
        if (updates.programId && updates.programId !== student.programId) {
            const config = await ctx.db.query("schoolConfig").first();
            const currentSemester = config?.currentSemester || 1;
            const currentYear = config?.currentYear || new Date().getFullYear();

            const existingEnrollment = await ctx.db.query("studentSemesterEnrollments")
                .withIndex("by_student_period", q => q.eq("studentId", id).eq("semester", currentSemester).eq("year", currentYear))
                .first();

            if (existingEnrollment) await ctx.db.patch(existingEnrollment._id, { status: "Withdrawn" });

            await ctx.db.insert("studentSemesterEnrollments", {
                studentId: id,
                programId: updates.programId,
                semester: currentSemester,
                year: currentYear,
                status: "Active",
                dateEnrolled: new Date().toISOString().split('T')[0],
            });
        }

        await ctx.db.patch(id, updates);
        await logAction(ctx, user._id, "UPDATE_STUDENT", `Updated student record: ${id}`);
        return { success: true };
    },
});

// ===== DELETE STUDENT =====

export const deleteStudent = mutation({
    args: { sessionId: v.optional(v.string()), id: v.id("students") },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:active:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const student = await ctx.db.get(args.id);
        if (!student) return { success: false, error: "Student not found" };

        // Cleanup snapshots
        const snapshots = await ctx.db.query("studentSemesterSnapshots").withIndex("by_student_period", q => q.eq("studentId", args.id)).collect();
        for (const s of snapshots) await ctx.db.delete(s._id);

        await ctx.db.delete(args.id);
        await logAction(ctx, user._id, "DELETE_STUDENT", `Deleted student: ${student.firstName} ${student.lastName}`);
        return { success: true };
    },
});

export const getStudentFullTranscript = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const student = await ctx.db
            .query("students")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
        
        if (!student) return { data: null, unauthorized: false, noStudentLink: true };

        // 1. Get all semester snapshots
        const snapshots = await ctx.db
            .query("studentSemesterSnapshots")
            .withIndex("by_student_period", (q) => q.eq("studentId", student._id))
            .collect();
        
        // 2. Get all assessments (using by_student_period prefix)
        const assessments = await ctx.db
            .query("assessments")
            .withIndex("by_student_period", (q) => q.eq("studentId", student._id))
            .collect();

        // 3. Map courses for assessments
        const courseIds = [...new Set(assessments.map(a => a.courseId))];
        const rawCourses = await Promise.all(courseIds.map(id => ctx.db.get(id)));
        const courseMap = new Map(rawCourses.filter(Boolean).map(c => [c!._id, c]));

        // 4. Group assessments by semester/year
        const transcript = snapshots.map(snap => {
            const semesterMarks = assessments.filter(a => a.semester === snap.semester && a.year === snap.year);
            
            // Calculate GPA and Total Credits for this semester
            let totalCreditsInSemester = 0;
            let totalGradePointsInSemester = 0;

            const enrichedMarks = semesterMarks.map(m => {
                const course = courseMap.get(m.courseId);
                const credits = course?.credits || 0;
                totalCreditsInSemester += credits;
                totalGradePointsInSemester += (m.gradePoints || 0) * credits;

                return {
                    ...m,
                    courseTitle: course?.title || "Unknown Course",
                    courseCode: course?.code || "???",
                    credits
                };
            });

            const semesterGpa = totalCreditsInSemester > 0 
                ? (totalGradePointsInSemester / totalCreditsInSemester) 
                : 0;

            return {
                semester: snap.semester,
                year: snap.year,
                gpa: semesterGpa,
                totalCredits: totalCreditsInSemester,
                status: snap.status,
                marks: enrichedMarks
            };
        });

        return {
            data: {
                studentInfo: {
                    fullName: `${student.firstName} ${student.lastName}`,
                    cgpa: student.cgpa,
                },
                transcript: transcript.sort((a,b) => (b.year - a.year) || (b.semester - a.semester))
            },
            unauthorized: false
        };
    }
});

export const getStudentFinancialLedger = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await getAuthUser(ctx, args.sessionId);
        if (!user) return { data: null, unauthorized: true };

        const student = await ctx.db
            .query("students")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .first();
        
        if (!student) return { data: null, unauthorized: false, noStudentLink: true };

        const payments = await ctx.db
            .query("payments")
            .withIndex("by_student_period", (q) => q.eq("studentId", student._id))
            .order("desc")
            .collect();

        return {
            data: {
                balance: student.balance,
                payments,
                studentInfo: {
                    fullName: `${student.firstName} ${student.lastName}`,
                    studentNumber: student.studentNumber || student.registrationNumber,
                }
            },
            unauthorized: false
        };
    }
});

// ===== BATCH OPERATIONS (PROMOTION/GRADUATION) =====

export const getByProgram = query({
    args: {
        sessionId: v.optional(v.string()),
        programId: v.id("programs"),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students");
        if (!user) return { data: [], unauthorized: true };

        const students = await ctx.db
            .query("students")
            .withIndex("by_program", (q) => q.eq("programId", args.programId))
            .filter((q) => q.eq(q.field("status"), "Active"))
            .collect();

        return { data: students, unauthorized: false };
    },
});

export const promoteBatch = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentIds: v.array(v.id("students")),
        targetProgramId: v.id("programs"), 
        currentYear: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:active:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        const schoolConfig = await ctx.db.query("schoolConfig").first();
        const nextSemester = schoolConfig?.currentSemester || 1;

        for (const id of args.studentIds) {
            await ctx.db.patch(id, { 
                programId: args.targetProgramId,
                status: "Active"
            });

            // Handle enrollment record
            const existing = await ctx.db.query("studentSemesterEnrollments")
                .withIndex("by_student_period", q => q.eq("studentId", id).eq("semester", nextSemester).eq("year", args.currentYear))
                .first();
            
            if (existing) {
                await ctx.db.patch(existing._id, { programId: args.targetProgramId, status: "Active" });
            } else {
                await ctx.db.insert("studentSemesterEnrollments", {
                    studentId: id,
                    programId: args.targetProgramId,
                    semester: nextSemester,
                    year: args.currentYear,
                    status: "Active",
                    dateEnrolled: new Date().toISOString().split('T')[0],
                });
            }
        }

        await logAction(ctx, user._id, "PROMOTE_STUDENTS", `Promoted ${args.studentIds.length} students to program: ${args.targetProgramId}`);
        return { success: true };
    },
});

export const graduateBatch = mutation({
    args: {
        sessionId: v.optional(v.string()),
        studentIds: v.array(v.id("students")),
        graduationYear: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:students:active:manage");
        if (!user) return { success: false, error: "Unauthorized" };

        for (const id of args.studentIds) {
            await ctx.db.patch(id, { status: "Graduated" });
            
            // Mark last enrollment as completed
            const lastEnrollment = await ctx.db.query("studentSemesterEnrollments")
                .withIndex("by_student_period", q => q.eq("studentId", id))
                .order("desc")
                .first();
            
            if (lastEnrollment) {
                await ctx.db.patch(lastEnrollment._id, { status: "Completed" });
            }
        }

        await logAction(ctx, user._id, "GRADUATE_STUDENTS", `Graduated ${args.studentIds.length} students in ${args.graduationYear}`);
        return { success: true };
    },
});

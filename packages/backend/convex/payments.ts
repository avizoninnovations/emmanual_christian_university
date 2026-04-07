//  Payments Module
// Session-based auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability, checkRateLimit, checkQueryAuth } from "./authHelpers";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

// ===== GET PAYMENTS (PAGINATED) =====

export const getPaginated = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        programId: v.optional(v.id("programs")),
        type: v.optional(v.union(v.literal("Student"), v.literal("General"))),
        searchTerm: v.optional(v.string()),
        searchMode: v.optional(v.union(v.literal("name"), v.literal("registrationNumber"), v.literal("studentNumber"), v.literal("sin"))),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { page: [], isDone: true, continueCursor: "", unauthorized: true };

        let result;

        // 1. Search Query (Priority)
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            const term = args.searchTerm.trim();

            // 1. Reg Number Search
            if (args.searchMode === 'registrationNumber' || args.searchMode === 'sin') {
                const searchField = args.searchMode === 'sin' ? 'registrationNumber' : args.searchMode;
                const student = await ctx.db
                    .query("students")
                    .withIndex("by_reg_number", q => q.eq("registrationNumber", term))
                    .first();

                if (!student) return { page: [], isDone: true, continueCursor: "", unauthorized: false };

                result = await ctx.db
                    .query("payments")
                    .withIndex("by_student", q => q.eq("studentId", student._id))
                    .filter(q => q.and(q.eq(q.field("semester"), args.semester), q.eq(q.field("year"), args.year)))
                    .paginate(args.paginationOpts);
            }
            // 2. Name Search
            else {
                // Determine if we need to search students or payerName
                // Since payments can be "Student" or "General", we ideally search BOTH or decide based on context.
                // But given the UI is "Student Search", we prioritize finding students.

                // A. Find matching students (limit to 20 to avoid massive OR queries)
                const matchingStudents = await ctx.db
                    .query("students")
                    .withSearchIndex("search_name", q => q.search("fullName", term))
                    .take(20);

                const studentIds = new Set(matchingStudents.map(s => s._id));

                if (studentIds.size > 0) {
                    // Filter payments by these student IDs
                    // For pagination with search, we can't easily mix "payerName" search and "studentId" filter efficiently in one query object
                    // So we will prioritize student matches.
                    // NOTE: This ignores "General" payments with matching payerName for now, which fits the "Student" filter context.
                    result = await ctx.db
                        .query("payments")
                        .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                        .filter(q => q.or(
                            ...Array.from(studentIds).map(id => q.eq(q.field("studentId"), id))
                        ))
                        .order("desc")
                        .paginate(args.paginationOpts);

                } else {
                    // Fallback: Search payerName (for General payments)
                    result = await ctx.db
                        .query("payments")
                        .withSearchIndex("search_payments", (q) => {
                            let search = q.search("payerName", term);
                            search = search.eq("semester", args.semester);
                            search = search.eq("year", args.year);
                            return search;
                        })
                        .paginate(args.paginationOpts);
                }
            }
        }
        // 2. Period/Class Filter
        else {
            let q = ctx.db
                .query("payments")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester).eq("year", args.year)
                );

            if (args.programId) {
                const studentsInProgram = await ctx.db.query("students")
                    .withIndex("by_program", q => q.eq("programId", args.programId!))
                    .collect();
                const studentIds = new Set(studentsInProgram.map(s => s._id));

                q = q.filter(qb => qb.or(
                    ...Array.from(studentIds).map(id => qb.eq(qb.field("studentId"), id))
                ));
            }

            // Apply type filter if specified
            if (args.type) {
                q = q.filter(qb => qb.eq(qb.field("type"), args.type!));
            }

            result = await q.order("desc").paginate(args.paginationOpts);
        }

        // Enrich results for the current page only
        const studentIds = [...new Set(result.page.map(p => p.studentId).filter(Boolean))] as Id<"students">[];
        const students = await Promise.all(studentIds.map(id => ctx.db.get(id)));
        const studentMap = new Map(students.filter(Boolean).map(s => [s!._id, s]));

        const programIds = [...new Set(Array.from(studentMap.values()).map(s => s!.programId).filter(Boolean))] as Id<"programs">[];
        const programs = await Promise.all(programIds.map(id => ctx.db.get(id)));
        const programMap = new Map(programs.filter(Boolean).map(p => [p!._id, p]));

        // Fetch fee structures for these levels for the current semester
        const feeStructures = await Promise.all(programIds.map(async (programId) => {
            const prog = programMap.get(programId);
            if (!prog) return null;
            const structure = await ctx.db.query("feeStructures")
                .withIndex("by_program_semester", q => q.eq("programId", programId).eq("semesterNumber", args.semester))
                .first();
            return structure ? { ...structure, programId } : null;
        }));
        const feeMap = new Map<string, any>();
        feeStructures.filter(Boolean).forEach(f => {
            if (f) feeMap.set(f.programId, f);
        });

        const enrichedPage = result.page.map((payment) => {
            let studentName = "General Income";
            let className = "";
            let studentAvatar: string | undefined = undefined;
            let studentBalance = 0;

            if (payment.studentId) {
                const student = studentMap.get(payment.studentId);
                if (student) {
                    studentName = `${student.firstName} ${student.lastName}`;
                    studentAvatar = student.avatarUrl;
                    const registrationNumber = student.registrationNumber;
                    if (student.programId) {
                        const prog = programMap.get(student.programId);
                        className = prog ? prog.name : "";

                        // Calculate Total Due (Balance + Current Fees)
                        const structure = feeMap.get(student.programId);
                        const currentFees = structure
                            ? (structure.total || 0)
                            : 0;
                        const rawBalance = student.balance || 0;
                        studentBalance = rawBalance + currentFees;
                    } else {
                        studentBalance = student.balance || 0;
                    }
                    return { ...payment, studentName, className, studentAvatar, studentBalance, registrationNumber };
                }
            }
 else if (payment.payerName) {
                studentName = payment.payerName;
            }
            return { ...payment, studentName, className, studentAvatar, studentBalance };
        });

        return { ...result, page: enrichedPage, unauthorized: false };
    },
});

export const getTotalCount = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        programId: v.optional(v.id("programs")),
        type: v.optional(v.union(v.literal("Student"), v.literal("General"))),
        searchTerm: v.optional(v.string()),
        searchMode: v.optional(v.union(v.literal("name"), v.literal("registrationNumber"), v.literal("studentNumber"), v.literal("sin"))),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { data: 0, unauthorized: true };

        let q;
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            const term = args.searchTerm.trim();
            if (args.searchMode === 'registrationNumber' || args.searchMode === 'sin') {
                const student = await ctx.db
                    .query("students")
                    .withIndex("by_reg_number", q => q.eq("registrationNumber", term))
                    .first();
                if (!student) return { data: 0, unauthorized: false };
                q = ctx.db
                    .query("payments")
                    .withIndex("by_student", q => q.eq("studentId", student._id))
                    .filter(q => q.and(q.eq(q.field("semester"), args.semester), q.eq(q.field("year"), args.year)));
            } else {
                q = ctx.db
                    .query("payments")
                    .withSearchIndex("search_payments", (q) => {
                        let search = q.search("payerName", term);
                        search = search.eq("semester", args.semester);
                        search = search.eq("year", args.year);
                        return search;
                    });
            }
        } else {
            q = ctx.db
                .query("payments")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester).eq("year", args.year)
                );

            if (args.programId) {
                const studentsInProgram = await ctx.db.query("students")
                    .withIndex("by_program", q => q.eq("programId", args.programId!))
                    .collect();
                const studentIds = new Set(studentsInProgram.map(s => s._id));
                q = q.filter(qb => qb.or(
                    ...Array.from(studentIds).map(id => qb.eq(qb.field("studentId"), id))
                ));
            }
        }

        let payments = await q.collect();
        // Apply type filter if specified
        if (args.type) {
            payments = payments.filter(p => p.type === args.type);
        }
        return { data: payments.length, unauthorized: false };
    },
});

// ===== GET ALL PAYMENTS (Non-Paginated, for backwards compat) =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.optional(v.id("students")),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { data: [], unauthorized: true };

        let payments;

        if (args.studentId) {
            const studentId = args.studentId;
            payments = await ctx.db
                .query("payments")
                .withIndex("by_student", (q) => q.eq("studentId", studentId))
                .filter((q) =>
                    q.and(
                        q.eq(q.field("semester"), args.semester),
                        q.eq(q.field("year"), args.year)
                    )
                )
                .collect();
        } else {
            payments = await ctx.db
                .query("payments")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester).eq("year", args.year)
                )
                .collect();
        }

        const studentIds = [...new Set(payments.map(p => p.studentId).filter(Boolean))] as Id<"students">[];
        const userIds = [...new Set(payments.map(p => p.recordedBy))] as Id<"users">[];

        const [students, users] = await Promise.all([
            Promise.all(studentIds.map(id => ctx.db.get(id))),
            Promise.all(userIds.map(id => ctx.db.get(id)))
        ]);

        const studentMap = new Map(students.filter(Boolean).map(s => [s!._id, s]));
        const userMap = new Map(users.filter(Boolean).map(u => [u!._id, u]));

        const data = payments.map((payment) => {
            let studentName = "General Income";
            if (payment.studentId) {
                const student = studentMap.get(payment.studentId) as any;
                if (student) {
                    studentName = `${student.firstName} ${student.lastName}`;
                }
            } else if (payment.payerName) {
                studentName = payment.payerName;
            }

            const recordedBy = userMap.get(payment.recordedBy) as any;
            return {
                ...payment,
                studentName,
                recordedByName: recordedBy
                    ? `${recordedBy.firstName} ${recordedBy.lastName}`
                    : "Unknown",
            };
        });

        return { data, unauthorized: false };
    },
});

export const getById = query({
    args: {
        sessionId: v.optional(v.string()),
        id: v.id("payments"),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { data: null, unauthorized: true };

        const payment = await ctx.db.get(args.id);
        if (!payment) return { data: null, unauthorized: false };

        let studentName = "General Income";
        if (payment.studentId) {
            const student = (await ctx.db.get(payment.studentId)) as any;
            if (student) {
                studentName = `${student.firstName} ${student.lastName}`;
            }
        } else if (payment.payerName) {
            studentName = payment.payerName;
        }

        const recordedBy = (await ctx.db.get(payment.recordedBy)) as any;

        const data = {
            ...payment,
            studentName,
            recordedByName: recordedBy ? `${recordedBy.firstName} ${recordedBy.lastName}` : "Unknown",
        };
        return { data, unauthorized: false };
    },
});

// ===== CREATE PAYMENT =====

export const createPayment = mutation({
    args: {
        sessionId: v.optional(v.string()),
        type: v.union(v.literal("Student"), v.literal("General")),
        studentId: v.optional(v.id("students")),
        payerName: v.optional(v.string()),
        amount: v.number(),
        date: v.string(),
        method: v.union(
            v.literal("CASH"),
            v.literal("BANK"),
            v.literal("BANK_SLIP"),
            v.literal("MOBILE_MONEY"),
            v.literal("IN_KIND")
        ),
        receiptNumber: v.string(),
        semester: v.number(),
        year: v.number(),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "finance:manage_fees");
        if (!user) return { success: false, error: "You don't have permission to manage fees and records." };

        const rateLimit = await checkRateLimit(ctx, `create_payment:${args.sessionId}`, 10, 60); // Max 10 per minute
        if (!rateLimit.success) return { success: false, error: rateLimit.error };

        // Check for duplicate receipt
        const existing = await ctx.db
            .query("payments")
            .withIndex("by_receipt", (q) => q.eq("receiptNumber", args.receiptNumber))
            .first();

        if (existing) {
            return { success: false, error: "The receipt number you entered already exists in our records." };
        }

        const paymentId = await ctx.db.insert("payments", {
            type: args.type,
            studentId: args.studentId,
            payerName: args.payerName,
            amount: args.amount,
            date: args.date,
            method: args.method,
            receiptNumber: args.receiptNumber,
            semester: args.semester,
            year: args.year,
            recordedBy: user._id,
            notes: args.notes,
        });

        // Update student balance if it's a student payment
        if (args.type === "Student" && args.studentId) {
            const student = (await ctx.db.get(args.studentId)) as any;
            if (student) {
                await ctx.db.patch(student._id, {
                    balance: student.balance - args.amount,
                });
            }
        }

        await logAction(
            ctx,
            user._id,
            "CREATE_PAYMENT",
            `Type: ${args.type}, Amount: ${args.amount}, Receipt: ${args.receiptNumber}`
        );

        return { success: true, paymentId };
    },
});

// ===== GET PAYMENT SUMMARY =====

export const getSummary = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { data: { totalAmount: 0, count: 0, byMethod: {} }, unauthorized: true };

        const payments = await ctx.db
            .query("payments")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester).eq("year", args.year)
            )
            .collect();

        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const studentFees = payments.filter(p => p.type === "Student").reduce((sum, p) => sum + p.amount, 0);
        const generalIncome = payments.filter(p => p.type === "General").reduce((sum, p) => sum + p.amount, 0);
        const count = payments.length;

        // Group by method
        const byMethod = payments.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const data = {
            totalAmount,
            studentFees,
            generalIncome,
            count,
            byMethod,
        };

        return { data, unauthorized: false };
    },
});

export const getRecent = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.optional(v.number()),
        year: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId);
        if (unauthorized) return { data: [], unauthorized: true };
        const limit = args.limit || 5;

        const paymentsQuery = (args.semester !== undefined && args.year !== undefined)
            ? ctx.db.query("payments")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester!).eq("year", args.year!)
                )
                .order("desc")
            : ctx.db.query("payments").order("desc");

        const payments = await paymentsQuery.take(limit);

        const studentIds = [...new Set(payments.map(p => p.studentId).filter(Boolean))] as Id<"students">[];
        const students = await Promise.all(studentIds.map(id => ctx.db.get(id)));
        const studentMap = new Map(students.filter(Boolean).map(s => [s!._id, s]));

        const data = payments.map((payment) => {
            let studentName = "General Income";
            let studentAvatar: string | undefined = undefined;

            if (payment.studentId) {
                const student = studentMap.get(payment.studentId) as any;
                if (student) {
                    studentName = `${student.firstName} ${student.lastName}`;
                    studentAvatar = student.avatarUrl;
                }
            } else if (payment.payerName) {
                studentName = payment.payerName;
            }

            return {
                ...payment,
                studentName,
                studentAvatar,
            };
        });
        return { data, unauthorized: false };
    },
});


// ===== SCHOOLPAY INTEGRATION =====

export const getSchoolPayTransactions = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        // Simple auth check
        const session = await ctx.db.get(args.sessionId);
        if (!session) return [];

        const payments = await ctx.db.query("payments").collect();
        // Optimally: add index("by_provider", ["provider"])

        const schoolPayPayments = payments.filter((p: any) => p.provider === "SCHOOLPAY" || p.method === "SCHOOLPAY");

        // 2. Enhance with student names
        const students = await Promise.all(schoolPayPayments.map(async (p: any) => {
            if (!p.studentId) return "Unknown";
            const s = (await ctx.db.get(p.studentId)) as any;
            return s ? `${s.firstName} ${s.lastName}` : "Unknown";
        }));

        return schoolPayPayments.map((p: any, i: number) => ({
            ...p,
            studentName: students[i]
        })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
});

// ===== GET STUDENT TERM FINANCIAL STATUS =====

export const getStudentTermStatus = query({
    args: {
        sessionId: v.optional(v.string()),
        studentId: v.id("students"),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return { data: null, unauthorized: true };

        const student = await ctx.db.get(args.studentId);
        if (!student) return { data: null, unauthorized: false };

        // Get program info
        const program = student.programId ? await ctx.db.get(student.programId) : null;
        const programName = program ? program.name : "Unknown";

        // Get fee structure for this program/semester
        const feeStructure = program ? await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", q => q.eq("programId", student.programId as any).eq("semesterNumber", args.semester))
            .first() : null;

        // Determine if student is on campus (Legacy, keeping logic but adapting types)
        const dormAssignment = await ctx.db
            .query("borrowRecords") // Placeholder check, using any related activity for boarding logic if needed
            .filter(q => q.and(q.eq(q.field("borrowerId"), args.studentId as any), q.eq(q.field("semester"), args.semester), q.eq(q.field("year"), args.year)))
            .first();
        const isBoarding = false; // Default for university unless specified

        const tuition = feeStructure?.tuitionFee || 0;

        const otherFeesApplied = feeStructure?.otherFeesApplied || [];

        const totalFees = feeStructure?.total || 0;

        const otherFees = otherFeesApplied.map((f: any) => ({ name: f.feeName, amount: f.amount }));

        // Get total paid this semester using the same optimized index as getFinanceDetail
        const payments = await ctx.db
            .query("payments")
            .withIndex("by_student_period", q => q
                .eq("studentId", args.studentId)
                .eq("semester", args.semester)
                .eq("year", args.year)
            )
            .collect();
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        // Use the same arrears calculation as getFinanceDetail
        const arrears = (student.balance || 0) + totalPaid - totalFees;

        const balance = totalFees - totalPaid + arrears;

        return {
            data: {
                totalFees,
                tuition,
                otherFees,
                totalPaid,
                balance,
                arrears,
                structureLabel: isBoarding ? "Boarding" : "Day Scholar",
                className: programName,
            },
            unauthorized: false,
        };
    },
});

// ===== GET ALL PAYMENTS FOR ANALYTICS =====

export const getPayments = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        search: v.optional(v.string()),
        method: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        programId: v.optional(v.id("programs")),
        type: v.optional(v.union(v.literal("Student"), v.literal("General"))),
    },
    handler: async (ctx, args) => {
        const { unauthorized } = await checkQueryAuth(ctx, args.sessionId, "access:finance");
        if (unauthorized) return [];

        let query = ctx.db
            .query("payments")
            .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year));

        // Apply filters
        if (args.type) {
            query = query.filter(q => q.eq(q.field("type"), args.type));
        }

        if (args.method) {
            query = query.filter(q => q.eq(q.field("method"), args.method));
        }

        if (args.dateFrom) {
            query = query.filter(q => q.gte(q.field("date"), args.dateFrom!));
        }

        if (args.dateTo) {
            query = query.filter(q => q.lte(q.field("date"), args.dateTo!));
        }

        if (args.programId) {
            // Get students in this program first
            const programStudents = await ctx.db
                .query("students")
                .withIndex("by_program", q => q.eq("programId", args.programId!))
                .collect();
            
            const studentIds = programStudents.filter(s => s.status === "Active").map(s => s._id);
            query = query.filter(q => 
                q.or(...studentIds.map(id => q.eq(q.field("studentId"), id)))
            );
        }

        const payments = await query.collect();

        // Apply search filter
        let filteredPayments = payments;
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            filteredPayments = payments.filter(p => 
                p.receiptNumber?.toLowerCase().includes(searchLower) ||
                p.method?.toLowerCase().includes(searchLower) ||
                p.type?.toLowerCase().includes(searchLower)
            );
        }

        // Enrich results with student and program names
        const enrichedPayments = await Promise.all(filteredPayments.map(async (payment) => {
            let studentName = "General Income";
            let programName = "N/A";

            if (payment.studentId) {
                const student = await ctx.db.get(payment.studentId);
                if (student) {
                    studentName = `${student.firstName} ${student.lastName}`;
                    if (student.programId) {
                        const programDoc = await ctx.db.get(student.programId);
                        if (programDoc) {
                            programName = programDoc.name;
                        }
                    }
                }
            } else if (payment.payerName) {
                studentName = payment.payerName;
            }

            return {
                ...payment,
                studentName,
                className: programName,
            };
        }));

        return enrichedPayments;
    },
});

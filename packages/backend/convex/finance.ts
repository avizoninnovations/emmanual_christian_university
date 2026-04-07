import { query } from "./_generated/server";
import { v } from "convex/values";
import { checkCapability } from "./authHelpers";

export const getDashboardStats = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) {
            return {
                income: 0,
                expense: 0,
                net: 0,
                pendingRequests: 0,
                collectionRate: 0,
                pendingList: [],
                unauthorized: true
            };
        }

        // Parallel Fetching
        const [payments, expenses, expensesPending, activeStudentsDocs, allPrograms, feeStructures] = await Promise.all([
            // 1. Income (Payments)
            ctx.db.query("payments")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect(),
 
            // 2. Expenses (Approved)
            ctx.db.query("expenses")
                .withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year))
                .collect(),
 
            // 3. Pending Requests (Expenses)
            ctx.db.query("expenses")
                .withIndex("by_status", q => q.eq("status", "Pending"))
                .collect(),
 
            // 4. Active Students
            ctx.db.query("students")
                .withIndex("by_status", q => q.eq("status", "Active"))
                .collect(),
 
            // 5. Programs
            ctx.db.query("programs").collect(),
 
            // 6. Fee Structures (Indexed by semester)
            ctx.db.query("feeStructures")
                .collect() // Filter by semesterNumber in logic or use an index if exists
        ]);

        // Aggregations
        const income = payments.reduce((sum, p) => sum + p.amount, 0);
        const approvedExpenses = expenses.filter(e => e.status === "Approved");
        const expense = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
        const net = income - expense;

        // Revenue Estimation
        const programMap = new Map(allPrograms.map(p => [p._id as string, p]));
        const semesterFees = feeStructures.filter(f => f.semesterNumber === args.semester);
        const feeMap = new Map(semesterFees.map(f => [f.programId as string, f]));

        const estimatedTotalRevenue = activeStudentsDocs.reduce((sum, s) => {
            const program = s.programId ? programMap.get(s.programId) : null;
            const structure = s.programId ? feeMap.get(s.programId) : null;
            if (!structure) return sum;

            const fee = structure.total || 0;
            return sum + fee;
        }, 0);

        const collectionRate = estimatedTotalRevenue > 0
            ? Math.round((income / estimatedTotalRevenue) * 100)
            : 0;

        // Pending Requests formatted
        const pendingList = await Promise.all(expensesPending.slice(0, 5).map(async (req) => {
            const requester = await ctx.db.get(req.recordedBy);
            return {
                _id: req._id,
                title: req.title,
                amount: req.amount,
                requesterName: requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown',
                date: req.date
            };
        }));

        return {
            income,
            expense,
            net,
            pendingRequests: expensesPending.length,
            collectionRate,
            pendingList,
            unauthorized: false
        };
    }
});

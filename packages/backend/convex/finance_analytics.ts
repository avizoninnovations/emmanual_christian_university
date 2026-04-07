import { query } from "./_generated/server";
import { v } from "convex/values";
import { checkCapability } from "./authHelpers";

export const getFinanceAnalytics = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance:analytics");
        if (!user) return { data: null, unauthorized: true };

        const [
            payments,
            expenses,
            feeStructures,
            students,
            programs
        ] = await Promise.all([
            ctx.db.query("payments").withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year)).collect(),
            ctx.db.query("expenses").withIndex("by_period", q => q.eq("semester", args.semester).eq("year", args.year)).collect(),
            ctx.db.query("feeStructures").withIndex("by_semester", q => q.eq("semesterNumber", args.semester)).collect(),
            ctx.db.query("students").filter(q => q.eq(q.field("status"), "Active")).collect(),
            ctx.db.query("programs").collect(),
        ]);

        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Theoretical gross revenue
        const feeByProgramMap = new Map();
        feeStructures.forEach(fs => {
            if (fs.programId) feeByProgramMap.set(fs.programId.toString(), fs);
        });

        let expectedRevenue = 0;
        let totalOutstanding = 0;
        let totalPreviousDebt = 0;
        let totalCurrentDebt = 0;
        
        const semesterPaymentsByStudent = new Map<string, number>();
        payments.forEach(p => {
            if (p.studentId) semesterPaymentsByStudent.set(p.studentId, (semesterPaymentsByStudent.get(p.studentId) || 0) + p.amount);
        });

        students.forEach(student => {
            const structure = student.programId ? feeByProgramMap.get(student.programId.toString()) : null;
            const feePerStudent = structure?.total || 0;

            expectedRevenue += feePerStudent;
            
            const paidThisSemester = semesterPaymentsByStudent.get(student._id) || 0;
            const arrears = student.balance || 0;
            
            const netPaidArrears = Math.min(Math.max(0, arrears), paidThisSemester);
            const remainingArrears = Math.max(0, arrears - netPaidArrears);
            const remainingSemester = Math.max(0, feePerStudent - (paidThisSemester - netPaidArrears));
            const totalDue = remainingArrears + remainingSemester;

            if (totalDue > 0) {
                totalOutstanding += totalDue;
                totalPreviousDebt += remainingArrears;
                totalCurrentDebt += remainingSemester;
            }
        });

        const expenseBreakdownMap = new Map<string, number>();
        expenses.forEach(e => expenseBreakdownMap.set(e.category, (expenseBreakdownMap.get(e.category) || 0) + e.amount));

        const expenseCategories = ["Utilities", "Food", "Transport", "Maintenance", "Salaries", "Stationery", "Other"];
        const expenseBreakdown = expenseCategories.map(cat => ({
            category: cat,
            amount: expenseBreakdownMap.get(cat) || 0
        }));

        const methodMixMap = new Map<string, number>();
        payments.forEach(p => methodMixMap.set(p.method, (methodMixMap.get(p.method) || 0) + p.amount));
        const methodMix = Array.from(methodMixMap.entries()).map(([name, value]) => ({ name, value }));

        const dailyTrendsMap = new Map<string, { income: number, expense: number }>();
        payments.forEach(p => {
            const date = new Date(p.date || Date.now()).toISOString().split('T')[0];
            const current = dailyTrendsMap.get(date) || { income: 0, expense: 0 };
            dailyTrendsMap.set(date, { ...current, income: current.income + p.amount });
        });

        expenses.forEach(e => {
            const date = new Date(e.date || Date.now()).toISOString().split('T')[0];
            const current = dailyTrendsMap.get(date) || { income: 0, expense: 0 };
            dailyTrendsMap.set(date, { ...current, expense: current.expense + e.amount });
        });

        const trends = Array.from(dailyTrendsMap.entries())
            .map(([date, values]) => ({ date, ...values }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const detailed = [
            ...payments.map(p => ({
                id: p._id,
                type: "Revenue",
                title: `Fee Payment - ${p.receiptNumber || 'N/A'}`,
                category: "Fees",
                amount: p.amount,
                date: new Date(p.date || Date.now()).toISOString().split('T')[0],
                status: "Success"
            })),
            ...expenses.map(e => ({
                id: e._id,
                type: "Expense",
                title: e.title,
                category: e.category,
                amount: e.amount,
                date: new Date(e.date || Date.now()).toISOString().split('T')[0],
                status: "Cleared"
            }))
        ].sort((a, b) => b.date.localeCompare(a.date));

        return {
            data: {
                metrics: {
                    totalCollected,
                    totalExpenses,
                    totalOutstanding,
                    previousDebt: totalPreviousDebt,
                    currentTermDebt: totalCurrentDebt,
                    expectedRevenue,
                    netBalance: totalCollected - totalExpenses,
                    collectionEfficiency: expectedRevenue > 0 ? Math.round((totalCollected / expectedRevenue) * 100) : 0
                },
                breakdowns: {
                    expenses: expenseBreakdown,
                    methods: methodMix
                },
                trends,
                detailed
            },
            unauthorized: false
        };
    }
});

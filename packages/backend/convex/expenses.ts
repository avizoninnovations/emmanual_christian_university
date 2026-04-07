// Expenses Module
// Session-based auth

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkCapability } from "./authHelpers";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

// ===== GET EXPENSES (PAGINATED) =====

export const getPaginated = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        category: v.optional(v.string()),
        searchTerm: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) {
            return { page: [], isDone: true, continueCursor: "", unauthorized: true };
        }

        let result;

        // 1. Search Query (Priority)
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            result = await ctx.db
                .query("expenses")
                .withSearchIndex("search_expenses", (q) => {
                    let search = q.search("title", args.searchTerm!);
                    if (args.category) search = search.eq("category", args.category as any);
                    search = search.eq("semester", args.semester);
                    search = search.eq("year", args.year);
                    return search;
                })
                .paginate(args.paginationOpts);
        }
        // 2. Category/Period Filter
        else {
            let q;
            if (args.category) {
                q = ctx.db
                    .query("expenses")
                    .withIndex("by_category_period", (q) =>
                        q.eq("category", args.category as any).eq("semester", args.semester).eq("year", args.year)
                    );
            } else {
                q = ctx.db
                    .query("expenses")
                    .withIndex("by_period", (q) =>
                        q.eq("semester", args.semester).eq("year", args.year)
                    );
            }

            // Apply date filters as database filters if possible, or post-query filters
            if (args.dateFrom) {
                q = q.filter((e) => e.gte(e.field("date"), args.dateFrom!));
            }
            if (args.dateTo) {
                q = q.filter((e) => e.lte(e.field("date"), args.dateTo!));
            }

            result = await q.order("desc").paginate(args.paginationOpts);
        }

        // Enrich results for the current page only
        const userIds = [...new Set(result.page.map(e => e.recordedBy))] as Id<"users">[];
        const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
        const userMap = new Map(users.filter((u): u is Exclude<typeof u, null> => !!u).map(u => [u._id, u]));

        const enrichedPage = result.page.map((expense) => {
            const recordedBy = userMap.get(expense.recordedBy) as any;
            return {
                ...expense,
                recordedByName: recordedBy
                    ? `${recordedBy.firstName} ${recordedBy.lastName}`
                    : "Unknown",
            };
        });

        return { ...result, page: enrichedPage, unauthorized: false };
    },
});

export const getExpensesTotalCount = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        category: v.optional(v.string()),
        searchTerm: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) {
            return { data: 0, unauthorized: true };
        }

        let q;
        if (args.searchTerm && args.searchTerm.trim().length > 0) {
            q = ctx.db
                .query("expenses")
                .withSearchIndex("search_expenses", (q) => {
                    let search = q.search("title", args.searchTerm!);
                    if (args.category) search = search.eq("category", args.category as any);
                    search = search.eq("semester", args.semester);
                    search = search.eq("year", args.year);
                    return search;
                });
        } else {
            if (args.category) {
                q = ctx.db
                    .query("expenses")
                    .withIndex("by_category_period", (q) =>
                        q.eq("category", args.category as any).eq("semester", args.semester).eq("year", args.year)
                    );
            } else {
                q = ctx.db
                    .query("expenses")
                    .withIndex("by_period", (q) =>
                        q.eq("semester", args.semester).eq("year", args.year)
                    );
            }

            if (args.dateFrom) {
                q = q.filter((e) => e.gte(e.field("date"), args.dateFrom!));
            }
            if (args.dateTo) {
                q = q.filter((e) => e.lte(e.field("date"), args.dateTo!));
            }
        }

        const expenses = await q.collect();
        return { data: expenses.length, unauthorized: false };
    },
});

// ===== GET ALL EXPENSES (Non-Paginated, for backwards compat) =====

export const getAll = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) {
            return { data: [], unauthorized: true };
        }

        let q;
        if (args.category) {
            q = ctx.db
                .query("expenses")
                .withIndex("by_category_period", (q) =>
                    q.eq("category", args.category as any).eq("semester", args.semester).eq("year", args.year)
                );
        } else {
            q = ctx.db
                .query("expenses")
                .withIndex("by_period", (q) =>
                    q.eq("semester", args.semester).eq("year", args.year)
                );
        }

        const expenses = await q.collect();

        const userIds = [...new Set(expenses.map(e => e.recordedBy))] as Id<"users">[];
        const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
        const userMap = new Map(users.filter((u): u is Exclude<typeof u, null> => !!u).map(u => [u._id, u]));

        const data = expenses.map((expense) => {
            const recordedBy = userMap.get(expense.recordedBy) as any;

            return {
                ...expense,
                recordedByName: recordedBy
                    ? `${recordedBy.firstName} ${recordedBy.lastName}`
                    : "Unknown",
            };
        });

        return { data, unauthorized: false };
    },
});

// ===== CREATE EXPENSE =====

export const createExpense = mutation({
    args: {
        sessionId: v.optional(v.string()),
        title: v.string(),
        category: v.union(
            v.literal("Utilities"),
            v.literal("Food"),
            v.literal("Transport"),
            v.literal("Maintenance"),
            v.literal("Salaries"),
            v.literal("Stationery"),
            v.literal("Others")
        ),
        amount: v.number(),
        date: v.string(),
        description: v.optional(v.string()),
        receiptUrl: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) return { success: false, error: "You don't have permission to record expenses." };

        const expenseId = await ctx.db.insert("expenses", {
            title: args.title,
            category: args.category,
            amount: args.amount,
            date: args.date,
            description: args.description,
            receiptUrl: args.receiptUrl,
            semester: args.semester,
            year: args.year,
            recordedBy: user._id,
        });



        await logAction(
            ctx,
            user._id,
            "CREATE_EXPENSE",
            `Amount: ${args.amount}, Title: ${args.title}`
        );

        return { success: true, expenseId };
    },
});

// ===== GET EXPENSES SUMMARY =====

export const getSummary = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) {
            return { data: { totalAmount: 0, count: 0, byCategory: {} }, unauthorized: true };
        }

        const expenses = await ctx.db
            .query("expenses")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester).eq("year", args.year)
            )
            .collect();

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        const count = expenses.length;

        // Group by category
        const byCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {} as Record<string, number>);

        const data = {
            totalAmount,
            count,
            byCategory,
        };

        return { data, unauthorized: false };
    },
});

// ===== GET ALL EXPENSES FOR ANALYTICS =====

export const getExpenses = query({
    args: {
        sessionId: v.optional(v.string()),
        semester: v.number(),
        year: v.number(),
        search: v.optional(v.string()),
        category: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await checkCapability(ctx, args.sessionId, "access:finance");
        if (!user) return [];

        let query = ctx.db
            .query("expenses")
            .withIndex("by_period", (q) =>
                q.eq("semester", args.semester).eq("year", args.year)
            );

        // Apply filters
        if (args.category) {
            query = query.filter(q => q.eq(q.field("category"), args.category));
        }

        if (args.dateFrom) {
            query = query.filter(q => q.gte(q.field("date"), args.dateFrom!));
        }

        if (args.dateTo) {
            query = query.filter(q => q.lte(q.field("date"), args.dateTo!));
        }

        const expenses = await query.collect();

        // Apply search filter
        let filteredExpenses = expenses;
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            filteredExpenses = expenses.filter(e => 
                e.title?.toLowerCase().includes(searchLower) ||
                e.category?.toLowerCase().includes(searchLower) ||
                e.receiptUrl?.toLowerCase().includes(searchLower)
            );
        }

        return filteredExpenses;
    },
});

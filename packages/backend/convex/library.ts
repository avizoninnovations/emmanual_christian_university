import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// LIBRARY CATALOG & LOANS
// ─────────────────────────────────────────────────────────

export const getBooks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("books").order("desc").collect();
  },
});

export const createBook = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    isbn: v.string(),
    totalCopies: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("books", {
      ...args,
      availableCopies: args.totalCopies,
    });
  },
});

export const getLoans = query({
  args: {
    studentId: v.optional(v.id("students")),
    status: v.optional(v.union(v.literal("active"), v.literal("returned"), v.literal("overdue"))),
  },
  handler: async (ctx, args) => {
    if (args.studentId) {
      const loans = await ctx.db.query("loans")
        .withIndex("by_student", (q) => q.eq("studentId", args.studentId!))
        .order("desc")
        .collect();
      if (args.status) {
        return loans.filter(l => l.status === args.status);
      }
      return loans;
    }

    if (args.status) {
      return await ctx.db.query("loans")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    
    return await ctx.db.query("loans").order("desc").collect();
  },
});

export const issueLoan = mutation({
  args: {
    bookId: v.id("books"),
    studentId: v.id("students"),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get book and check availability
    const book = await ctx.db.get(args.bookId);
    if (!book || book.availableCopies <= 0) {
      throw new Error("Book is not available for loan.");
    }

    // 2. Decrement available copies
    await ctx.db.patch(args.bookId, {
      availableCopies: book.availableCopies - 1,
    });

    // 3. Create loan record
    return await ctx.db.insert("loans", {
      ...args,
      borrowDate: Date.now(),
      status: "active",
    });
  },
});

export const returnLoan = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan || loan.status === "returned") {
      throw new Error("Invalid or already returned loan.");
    }

    // 1. Increment available copies
    const book = await ctx.db.get(loan.bookId);
    if (book) {
      await ctx.db.patch(loan.bookId, {
        availableCopies: book.availableCopies + 1,
      });
    }

    // 2. Mark loan as returned
    await ctx.db.patch(args.loanId, {
      status: "returned",
      returnDate: Date.now(),
    });
  },
});

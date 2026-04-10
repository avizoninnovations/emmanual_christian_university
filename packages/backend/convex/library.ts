import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { logAction } from "./audit_logger";
import { assertRole, assertAuthenticated } from "./lib/utils";

// ─────────────────────────────────────────────────────────
// LIBRARY CATALOG & LOANS
// ─────────────────────────────────────────────────────────

export const getBooks = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
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
    await assertRole(ctx, ["admin", "librarian"]);
    const id = await ctx.db.insert("books", {
      ...args,
      availableCopies: args.totalCopies,
    });

    await logAction(ctx, {
      action: "CREATE_BOOK",
      resource: "books",
      details: `Added new book to catalog: ${args.title} (ISBN: ${args.isbn})`
    });

    return id;
  },
});

export const getLoans = query({
  args: {
    studentId: v.optional(v.id("students")),
    status: v.optional(v.union(v.literal("active"), v.literal("returned"), v.literal("overdue"))),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
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
    await assertRole(ctx, ["admin", "librarian"]);
    // 1. Get book and check availability
    const book = await ctx.db.get(args.bookId);
    if (!book || book.availableCopies <= 0) {
      throw new Error("Book is not available for loan.");
    }

    // 2. Get student context for term/year tracking
    const student = await ctx.db.get(args.studentId);
    if (!student || student.term === undefined || student.year === undefined) {
      throw new Error("Student enrollment period not found.");
    }

    // 3. Decrement available copies
    await ctx.db.patch(args.bookId, {
      availableCopies: book.availableCopies - 1,
    });

    // 4. Create loan record
    const id = await ctx.db.insert("loans", {
      ...args,
      term: student.term,
      year: student.year,
      borrowDate: Date.now(),
      status: "active",
    });

    await logAction(ctx, {
      action: "ISSUE_LOAN",
      resource: "loans",
      details: `Issued book ${args.bookId} to student ${args.studentId} (Term ${student.term}, ${student.year}). Due: ${new Date(args.dueDate).toLocaleDateString()}`
    });

    return id;
  },
});

export const returnLoan = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "librarian"]);
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

    await logAction(ctx, {
      action: "RETURN_LOAN",
      resource: "loans",
      details: `Book returned and loan ${args.loanId} cleared.`
    });
  },
});

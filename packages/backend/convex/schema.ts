import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema.js";

const academicPeriodFields = {
  term: v.number(), // Semester/Term 1, 2, or 3
  year: v.number(), // e.g. 2026
};

export default defineSchema({
  ...authTables,

  /**
   * Extended staff profile linked to the Better Auth `user` table.
   */
  staffProfiles: defineTable({
    userId: v.string(),
    roles: v.array(v.string()),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    staffNumber: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  faculties: defineTable({
    name: v.string(),
    code: v.string(),
    deanId: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  departments: defineTable({
    name: v.string(),
    code: v.string(),
    facultyId: v.id("faculties"),
    hodId: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_status", ["status"]),

  programs: defineTable({
    name: v.string(),
    code: v.string(),
    departmentId: v.id("departments"),
    level: v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Bachelor"), v.literal("Master")),
    durationYears: v.number(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_department", ["departmentId"])
    .index("by_level", ["level"])
    .index("by_status", ["status"]),

  /**
   * 4. Academic Calendar (Periods/Semesters)
   */
  academicPeriods: defineTable({
    name: v.string(), // e.g., "Semester 1"
    term: v.number(), // 1, 2, or 3
    year: v.number(), // e.g., 2026
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed")),
  })
    .index("by_status", ["status"])
    .index("by_year", ["year"])
    .index("by_term_year", ["term", "year"]),

  /**
   * 5. Admissions Pipeline
   */
  applicants: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    programId: v.id("programs"),
    admissionType: v.union(v.literal("National"), v.literal("Direct")),
    status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("accepted"), v.literal("rejected"), v.literal("enrolled")),
    applicationDate: v.number(),
    ...academicPeriodFields,
  })
    .index("by_program", ["programId"])
    .index("by_status", ["status"])
    .index("by_period", ["term", "year"]),

  /**
   * 6. Enrolled Students
   */
  students: defineTable({
    userId: v.string(),
    registrationNumber: v.string(),
    programId: v.id("programs"),
    yearOfStudy: v.number(),
    currentPeriodId: v.optional(v.id("academicPeriods")),
    ...academicPeriodFields, // Representing current active session
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deferred"), v.literal("graduating"), v.literal("discontinued")),
    financeStatus: v.union(v.literal("cleared"), v.literal("partial"), v.literal("pending")),
  })
    .index("by_userId", ["userId"])
    .index("by_regNumber", ["registrationNumber"])
    .index("by_program", ["programId"])
    .index("by_status", ["status"])
    .index("by_period", ["term", "year"]),

  /**
   * 7. Finance (Fee Structures, Ledger, Transactions)
   */
  feeStructures: defineTable({
    programId: v.id("programs"),
    periodId: v.id("academicPeriods"),
    ...academicPeriodFields,
    tuitionFee: v.number(),
    registrationFee: v.number(),
    libraryFee: v.number(),
    ictFee: v.number(),
    activityFee: v.number(),
  })
    .index("by_program", ["programId"])
    .index("by_period", ["periodId"])
    .index("by_term_year", ["term", "year"]),

  studentLedger: defineTable({
    studentId: v.id("students"),
    periodId: v.id("academicPeriods"),
    ...academicPeriodFields,
    totalDue: v.number(),
    totalPaid: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_period", ["periodId"])
    .index("by_term_year", ["term", "year"]),

  transactions: defineTable({
    studentId: v.id("students"),
    ...academicPeriodFields,
    amount: v.number(),
    type: v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver")),
    date: v.number(),
    reference: v.string(),
  })
    .index("by_student", ["studentId"])
    .index("by_date", ["date"])
    .index("by_period", ["term", "year"]),

  /**
   * 8. Marks & Assessments
   */
  gradingScales: defineTable({
    grade: v.string(),
    minScore: v.number(),
    maxScore: v.number(),
    gpaValue: v.number(),
  })
    .index("by_grade", ["grade"]),

  assessmentBlocks: defineTable({
    courseId: v.string(),
    lecturerId: v.string(),
    type: v.union(v.literal("Midterm"), v.literal("Final"), v.literal("Coursework")),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
    submissionDate: v.number(),
    ...academicPeriodFields,
  })
    .index("by_status", ["status"])
    .index("by_lecturer", ["lecturerId"])
    .index("by_period", ["term", "year"]),

  /**
   * 9. Library Catalog
   */
  books: defineTable({
    title: v.string(),
    author: v.string(),
    isbn: v.string(),
    totalCopies: v.number(),
    availableCopies: v.number(),
  })
    .index("by_isbn", ["isbn"])
    .index("by_title", ["title"]),

  loans: defineTable({
    bookId: v.id("books"),
    studentId: v.id("students"),
    ...academicPeriodFields,
    borrowDate: v.number(),
    dueDate: v.number(),
    returnDate: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("returned"), v.literal("overdue")),
  })
    .index("by_student", ["studentId"])
    .index("by_book", ["bookId"])
    .index("by_status", ["status"])
    .index("by_period", ["term", "year"]),

  /**
   * 10. System Audit Logs
   */
  auditLogs: defineTable({
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    action: v.string(),
    resource: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_userId", ["userId"])
    .index("by_action", ["action"]),

  /**
   * 11. Custom System Roles
   */
  systemRoles: defineTable({
    name: v.string(),
    code: v.string(), // Unique slug like 'registrar', 'dean'
    description: v.optional(v.string()),
  })
    .index("by_code", ["code"]),
});


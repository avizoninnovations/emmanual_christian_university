import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema.js";

export default defineSchema({
  ...authTables,

  /**
   * Extended staff profile linked to the Better Auth `user` table.
   * Stores role array (a user can be both admin and staff), 
   * personal details, and department assignment.
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

  /**
   * 1. Faculties
   * e.g., "Faculty of Science & IT", "Faculty of Theology"
   */
  faculties: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "FSIT"
    deanId: v.optional(v.string()), // References staffProfiles._id
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  /**
   * 2. Departments
   * e.g., "Computer Science", links to a Faculty
   */
  departments: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "CS"
    facultyId: v.id("faculties"),
    hodId: v.optional(v.string()), // References staffProfiles._id (Head of Dept)
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_status", ["status"]),

  /**
   * 3. Programs
   * e.g., "Bachelor of Computer Science", links to a Department
   */
  programs: defineTable({
    name: v.string(),
    code: v.string(), // e.g., "BCS"
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
    year: v.number(), // e.g., 2026
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed")),
  })
    .index("by_status", ["status"])
    .index("by_year", ["year"]),

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
  })
    .index("by_program", ["programId"])
    .index("by_status", ["status"]),

  /**
   * 6. Enrolled Students
   */
  students: defineTable({
    userId: v.string(), // References Better Auth 'user' table
    registrationNumber: v.string(), // e.g. STU-26-001
    programId: v.id("programs"),
    yearOfStudy: v.number(),
    currentPeriodId: v.optional(v.id("academicPeriods")),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deferred"), v.literal("graduating"), v.literal("discontinued")),
    financeStatus: v.union(v.literal("cleared"), v.literal("partial"), v.literal("pending")),
  })
    .index("by_userId", ["userId"])
    .index("by_regNumber", ["registrationNumber"])
    .index("by_program", ["programId"])
    .index("by_status", ["status"]),

  /**
   * 7. Finance (Fee Structures, Ledger, Transactions)
   */
  feeStructures: defineTable({
    programId: v.id("programs"),
    periodId: v.id("academicPeriods"),
    tuitionFee: v.number(),
    registrationFee: v.number(),
    libraryFee: v.number(),
    ictFee: v.number(),
    activityFee: v.number(),
  })
    .index("by_program", ["programId"])
    .index("by_period", ["periodId"]),

  studentLedger: defineTable({
    studentId: v.id("students"),
    periodId: v.id("academicPeriods"),
    totalDue: v.number(),
    totalPaid: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_period", ["periodId"]),

  transactions: defineTable({
    studentId: v.id("students"),
    amount: v.number(),
    type: v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver")),
    date: v.number(),
    reference: v.string(),
  })
    .index("by_student", ["studentId"])
    .index("by_date", ["date"]),

  /**
   * 8. Marks & Assessments
   */
  gradingScales: defineTable({
    grade: v.string(), // e.g. "A"
    minScore: v.number(),
    maxScore: v.number(),
    gpaValue: v.number(), // e.g. 4.0
  })
    .index("by_grade", ["grade"]),

  assessmentBlocks: defineTable({
    courseId: v.string(), // Placeholder until course catalog is spec'd
    lecturerId: v.string(), // References staffProfiles._id
    type: v.union(v.literal("Midterm"), v.literal("Final"), v.literal("Coursework")),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
    submissionDate: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_lecturer", ["lecturerId"]),

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
    borrowDate: v.number(),
    dueDate: v.number(),
    returnDate: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("returned"), v.literal("overdue")),
  })
    .index("by_student", ["studentId"])
    .index("by_book", ["bookId"])
    .index("by_status", ["status"]),
});


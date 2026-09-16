import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema.js";

const academicPeriodFields = {
  term: v.number(), // Semester/Term 1, 2, or 3
  year: v.number(), // e.g. 2026
};

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
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
    staffNumber: v.optional(v.string()), // Legacy/Phone
    staffId: v.string(),     // Official University ID
    status: v.union(v.literal("active"), v.literal("inactive")),
    ...timestamps,
  })
    .index("by_userId", ["userId"])
    .index("by_staffId", ["staffId"])
    .index("by_status", ["status"]),

  faculties: defineTable({
    name: v.string(),
    code: v.string(),
    deanId: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    ...timestamps,
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
    ...timestamps,
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
    ...timestamps,
  })
    .index("by_department", ["departmentId"])
    .index("by_level", ["level"])
    .index("by_status", ["status"]),

  /**
   * Course Catalog (Unit Curriculum)
   */
  courses: defineTable({
    code: v.string(), // e.g. "BBA 101", "CMP 102"
    title: v.string(),
    creditUnits: v.number(), // e.g. 3
    departmentId: v.id("departments"),
    programId: v.id("programs"),
    yearOfStudy: v.number(), // 1, 2, 3, 4
    semester: v.number(), // 1, 2
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    ...timestamps,
  })
    .index("by_code", ["code"])
    .index("by_department", ["departmentId"])
    .index("by_program", ["programId"])
    .index("by_status", ["status"])
    .index("by_program_year_sem", ["programId", "yearOfStudy", "semester"]),

  /**
   * Course Allocations (Lecturer teaching assignments per semester)
   */
  courseAllocations: defineTable({
    courseId: v.id("courses"),
    lecturerId: v.string(), // staff userId
    periodId: v.id("academicPeriods"),
    departmentId: v.id("departments"),
    ...timestamps,
  })
    .index("by_lecturer", ["lecturerId"])
    .index("by_course_period", ["courseId", "periodId"])
    .index("by_period", ["periodId"])
    .index("by_department_period", ["departmentId", "periodId"]),

  /**
   * Student Course Registrations (Semester enrollments in specific courses)
   */
  studentCourseRegistrations: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    status: v.union(v.literal("registered"), v.literal("dropped"), v.literal("completed")),
    ...timestamps,
  })
    .index("by_student", ["studentId"])
    .index("by_course_period", ["courseId", "periodId"])
    .index("by_student_period", ["studentId", "periodId"]),

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
    ...timestamps,
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
    ...timestamps,
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
    ...timestamps,
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
    otherFees: v.optional(v.number()),
    currency: v.optional(v.string()), // e.g. "SSP", "USD"
    ...timestamps,
  })
    .index("by_program", ["programId"])
    .index("by_period", ["periodId"])
    .index("by_term_year", ["term", "year"])
    .index("by_program_period", ["programId", "periodId"]),

  studentLedger: defineTable({
    studentId: v.id("students"),
    periodId: v.id("academicPeriods"),
    ...academicPeriodFields,
    totalDue: v.number(),
    totalPaid: v.number(),
    balance: v.optional(v.number()),
    status: v.optional(v.union(v.literal("cleared"), v.literal("partial"), v.literal("pending"))),
    lastPaymentDate: v.optional(v.number()),
    lastPaymentAmount: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_student", ["studentId"])
    .index("by_period", ["periodId"])
    .index("by_status", ["status"])
    .index("by_term_year", ["term", "year"])
    .index("by_student_period", ["studentId", "periodId"]),

  transactions: defineTable({
    studentId: v.id("students"),
    periodId: v.optional(v.id("academicPeriods")),
    ...academicPeriodFields,
    amount: v.number(),
    type: v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver")),
    method: v.optional(v.union(v.literal("cash"), v.literal("bank"), v.literal("mobile_money"), v.literal("other"))),
    receiptNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
    date: v.number(),
    reference: v.string(),
    ...timestamps,
  })
    .index("by_student", ["studentId"])
    .index("by_date", ["date"])
    .index("by_receiptNumber", ["receiptNumber"])
    .index("by_period", ["term", "year"]),

  /**
   * 8. Marks & Assessments
   */
  gradingScales: defineTable({
    grade: v.string(),
    minScore: v.number(),
    maxScore: v.number(),
    gpaValue: v.number(),
    ...timestamps,
  })
    .index("by_grade", ["grade"]),

  assessmentBlocks: defineTable({
    courseId: v.string(),
    lecturerId: v.string(),
    type: v.union(v.literal("Midterm"), v.literal("Final"), v.literal("Coursework")),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
    submissionDate: v.number(),
    ...academicPeriodFields,
    ...timestamps,
  })
    .index("by_status", ["status"])
    .index("by_lecturer", ["lecturerId"])
    .index("by_period", ["term", "year"]),

  /**
   * Individual Student Gradebook Marks
   */
  studentAssessments: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    lecturerId: v.string(),
    courseworkMarks: v.number(), // 0 - 30
    examMarks: v.number(),       // 0 - 70
    finalScore: v.number(),      // 0 - 100
    grade: v.string(),           // "A", "B+", etc.
    gradePoints: v.number(),     // 0.0 - 4.0
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("returned")),
    returnReason: v.optional(v.string()),
    isUnlocked: v.optional(v.boolean()),
    unlockedBy: v.optional(v.string()),
    unlockedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_course_period", ["courseId", "periodId"])
    .index("by_student", ["studentId"])
    .index("by_student_course_period", ["studentId", "courseId", "periodId"])
    .index("by_status", ["status"]),

  /**
   * Class Lecture Session Attendance
   */
  attendanceRecords: defineTable({
    courseId: v.id("courses"),
    periodId: v.id("academicPeriods"),
    lecturerId: v.string(),
    date: v.string(), // YYYY-MM-DD
    topic: v.optional(v.string()),
    records: v.array(
      v.object({
        studentId: v.id("students"),
        status: v.union(v.literal("present"), v.literal("absent"), v.literal("late")),
      })
    ),
    ...timestamps,
  })
    .index("by_course_period", ["courseId", "periodId"])
    .index("by_course_period_date", ["courseId", "periodId", "date"]),

  /**
   * 9. Library Catalog
   */
  books: defineTable({
    title: v.string(),
    author: v.string(),
    isbn: v.string(),
    totalCopies: v.number(),
    availableCopies: v.number(),
    ...timestamps,
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
    ...timestamps,
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
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    location: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_userId", ["userId"])
    .index("by_action", ["action"]),

  /**
   * 11. Custom System Roles
   */
  systemRoles: defineTable({
    name: v.string(),
    code: v.string(), // Unique slug like 'registrar', 'dean'
    description: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_code", ["code"]),

  /**
   * 12. Global System Configurations
   */
  systemConfigurations: defineTable({
    universityName: v.string(),
    universityMotto: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    ...timestamps,
  }),
});


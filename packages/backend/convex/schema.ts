import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const capabilityValidator = v.string()

// Base fields for academic period filtering
const academicPeriodFields = {
  semester: v.number(), // 1, 2, or 3
  year: v.number(), // 2024, 2025, etc.
}

export default defineSchema({
  // ===== UNIVERSITY CONFIGURATION =====

  schoolConfig: defineTable({
    name: v.string(),
    motto: v.string(),
    address: v.string(),
    contactEmail: v.string(),
    phone: v.optional(v.string()),
    phones: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    currentPeriodId: v.optional(v.id("academicPeriods")),
    currentSemester: v.optional(v.number()),
    currentYear: v.optional(v.number()),
    website: v.optional(v.string()),
    semesterStartDate: v.optional(v.string()),
    semesterEndDate: v.optional(v.string()),
    currency: v.optional(v.string()),
    currencySymbol: v.optional(v.string()),
    schoolType: v.optional(v.union(v.literal("Day"), v.literal("Boarding"), v.literal("Both"))),
    hasMedicalModule: v.optional(v.boolean()),
  }),

  academicPeriods: defineTable({
    semester: v.number(),
    year: v.number(),
    name: v.string(), // e.g., "Semester 1 2024/2025"
    status: v.union(
      v.literal("Active"),
      v.literal("Completed"),
      v.literal("Upcoming"),
    ),
    createdAt: v.number(),
    createdBy: v.id("users"),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_semester_year", ["semester", "year"])
    .index("by_year", ["year"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),

  accounts: defineTable({
    userId: v.id("users"),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    password: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_provider_account", ["providerId", "accountId"]),

  verifications: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_identifier", ["identifier"]),

  // ===== AUTHENTICATION & USERS =====

  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    role: v.string(),
    roleId: v.optional(v.id("roles")),
    capabilities: v.optional(v.array(capabilityValidator)),
    firstName: v.string(),
    lastName: v.string(),
    gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    contact: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastLogin: v.optional(v.number()),
    courses: v.optional(v.array(v.string())),
    baseSalary: v.optional(v.number()),
    departmentIds: v.optional(v.array(v.id("faculties"))), // Legacy alias for UI compatibility
    facultyIds: v.optional(v.array(v.id("faculties"))),
    isHOD: v.optional(v.boolean()), // Legacy
    isDean: v.optional(v.boolean()),
    staffId: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
    deactivatedAt: v.optional(v.number()),
    allowances: v.optional(v.number()),
    deductions: v.optional(v.number()),
    allowanceDetails: v.optional(v.array(v.object({
      name: v.string(),
      amount: v.number(),
      type: v.union(v.literal("fixed"), v.literal("percentage")),
      appliesTo: v.optional(v.string()),
    }))),
    deductionDetails: v.optional(v.array(v.object({
      name: v.string(),
      amount: v.number(),
      type: v.union(v.literal("fixed"), v.literal("percentage")),
      appliesTo: v.optional(v.string()),
    }))),
    salaryUpdatedAt: v.optional(v.number()),
    employmentStatus: v.optional(v.union(v.literal("Active"), v.literal("On Leave"), v.literal("Inactive"))),
    activeChannelId: v.optional(v.id("channels")),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"])
    .index("by_staffId", ["staffId"])
    .searchIndex("search_staff", {
      searchField: "firstName",
      filterFields: ["role", "isActive", "staffId"],
    }),

  roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // ===== PROGRAMS (Replaces Classes) =====

  programs: defineTable({
    name: v.string(), // e.g., Bachelor of Computer Science
    code: v.string(), // e.g., BCS
    facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
    durationYears: v.number(),
    description: v.optional(v.string()),
    awardType: v.union(v.literal("Certificate"), v.literal("Diploma"), v.literal("Degree"), v.literal("Masters"), v.literal("PhD")),
    coordinatorId: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_faculty", ["facultyId"])
    .index("by_coordinator", ["coordinatorId"]),

  // ===== COURSES (Replaces Subjects) =====

  courses: defineTable({
    code: v.string(), // e.g., CS101
    title: v.string(),
    description: v.optional(v.string()),
    credits: v.number(),
    facultyId: v.optional(v.id("faculties")), // CHANGED from departmentId
    programIds: v.optional(v.array(v.id("programs"))),
    status: v.union(v.literal("Active"), v.literal("Inactive")),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_faculty", ["facultyId"])
    .searchIndex("search_courses", {
      searchField: "title",
      filterFields: ["status"],
    }),

  // ===== STUDENTS =====

  students: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    fullName: v.optional(v.string()),
    studentNumber: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    gender: v.union(v.literal("Male"), v.literal("Female")),
    dateOfBirth: v.string(),
    enrollmentDate: v.string(),
    programId: v.optional(v.id("programs")),
    balance: v.number(),
    status: v.union(
      v.literal("Active"),
      v.literal("Suspended"),
      v.literal("Discontinued"),
      v.literal("Alumni"),
      v.literal("Graduated"),
    ),
    avatarUrl: v.optional(v.string()),
    intakeYear: v.optional(v.number()),
    intakeSemester: v.optional(v.number()),
    currentYearOfStudy: v.optional(v.number()),
    cgpa: v.optional(v.number()),
    emergencyContactId: v.optional(v.id("emergencyContacts")),
    userId: v.optional(v.id("users")),
  })
    .index("by_program", ["programId"])
    .index("by_status", ["status"])
    .index("by_reg_number", ["registrationNumber"])
    .index("by_student_number", ["studentNumber"])
    .index("by_balance", ["balance"])
    .index("by_emergency_contact", ["emergencyContactId"])
    .index("by_user", ["userId"])
    .searchIndex("search_name", {
      searchField: "fullName",
      filterFields: ["status", "programId", "registrationNumber"],
    }),


  studentCourseRegistrations: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    programId: v.id("programs"),
    semester: v.number(),
    year: v.number(),
    status: v.union(v.literal("Registered"), v.literal("Dropped"), v.literal("Completed")),
    isRetake: v.boolean(),
  })
    .index("by_student_period", ["studentId", "semester", "year"])
    .index("by_course_period", ["courseId", "semester", "year"])
    .index("by_period", ["semester", "year"]),

  studentSemesterEnrollments: defineTable({
    studentId: v.id("students"),
    programId: v.id("programs"),
    semester: v.number(),
    year: v.number(),
    status: v.union(v.literal("Active"), v.literal("Withdrawn"), v.literal("Completed")),
    dateEnrolled: v.string(),
  })
    .index("by_student_period", ["studentId", "semester", "year"])
    .index("by_program_period", ["programId", "semester", "year"])
    .index("by_period", ["semester", "year"]),

  // ===== ACADEMICS =====

  assessments: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    programId: v.optional(v.id("programs")),
    ...academicPeriodFields,
    courseworkMarks: v.optional(v.number()),
    examMarks: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    grade: v.optional(v.string()),
    gradePoints: v.optional(v.number()),
    lecturerComment: v.optional(v.string()),
    hodComment: v.optional(v.string()),
    status: v.union(v.literal("Draft"), v.literal("Submitted"), v.literal("Approved"), v.literal("Released")),
    editedByHOD: v.optional(v.boolean()),
    lecturerEditAccess: v.optional(v.boolean()), // Flag for one-off edit permission
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_student_period", ["studentId", "semester", "year"])
    .index("by_course_period", ["courseId", "semester", "year"])
    .index("by_program_period", ["programId", "semester", "year"])
    .index("by_period", ["semester", "year"])
    .index("by_status", ["status"]),

  // ===== FINANCE =====

  payments: defineTable({
    type: v.union(v.literal("Student"), v.literal("General")),
    studentId: v.optional(v.id("students")),
    payerName: v.optional(v.string()),
    amount: v.number(),
    date: v.string(),
    method: v.union(v.literal("CASH"), v.literal("BANK"), v.literal("BANK_SLIP"), v.literal("MOBILE_MONEY"), v.literal("IN_KIND")),
    provider: v.optional(v.union(v.literal("CASH"), v.literal("BANK"))),
    externalReference: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
    receiptNumber: v.string(),
    recordedBy: v.id("users"),
    notes: v.optional(v.string()),
    payrollId: v.optional(v.id("payroll")),
    ...academicPeriodFields,
  })
    .index("by_student", ["studentId"])
    .index("by_student_period", ["studentId", "semester", "year"])
    .index("by_period", ["semester", "year"])
    .index("by_type_period", ["type", "semester", "year"])
    .index("by_receipt", ["receiptNumber"])
    .index("by_payroll", ["payrollId"])
    .searchIndex("search_payments", {
      searchField: "payerName",
      filterFields: ["semester", "year", "type"],
    }),

  expenses: defineTable({
    title: v.string(),
    category: v.union(
      v.literal("Utilities"),
      v.literal("Food"),
      v.literal("Transport"),
      v.literal("Maintenance"),
      v.literal("Salaries"),
      v.literal("Stationery"),
      v.literal("Others"),
    ),
    amount: v.number(),
    date: v.string(),
    description: v.optional(v.string()),
    recordedBy: v.id("users"),
    status: v.optional(v.union(v.literal("Pending"), v.literal("Approved"), v.literal("Rejected"))),
    approvedBy: v.optional(v.id("users")),
    receiptUrl: v.optional(v.string()),
    ...academicPeriodFields,
  })
    .index("by_period", ["semester", "year"])
    .index("by_category_period", ["category", "semester", "year"])
    .index("by_status", ["status"])
    .searchIndex("search_expenses", {
      searchField: "title",
      filterFields: ["category", "semester", "year"],
    }),

  otherFees: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    amount: v.number(),
    status: v.union(v.literal("Active"), v.literal("Inactive")),
  })
    .index("by_status", ["status"]),

  feeStructures: defineTable({
    programId: v.optional(v.id("programs")),
    semesterNumber: v.number(),
    tuitionFee: v.optional(v.number()),
    total: v.optional(v.number()),
    otherFeesApplied: v.optional(v.array(v.object({
      feeId: v.id("otherFees"),
      feeName: v.string(),
      amount: v.number(),
    }))),
  })
    .index("by_program_semester", ["programId", "semesterNumber"])
    .index("by_semester", ["semesterNumber"]),

  // ===== ATTENDANCE =====

  attendance: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    date: v.string(),
    status: v.union(v.literal("Present"), v.literal("Absent"), v.literal("Late"), v.literal("Sick")),
    isSick: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    lecturerId: v.optional(v.id("users")),
    slotId: v.optional(v.id("timeSlots")),
    programId: v.optional(v.id("programs")),
    ...academicPeriodFields,
  })
    .index("by_student_period", ["studentId", "semester", "year"])
    .index("by_course_period", ["courseId", "semester", "year"])
    .index("by_course_date", ["courseId", "date"])
    .index("by_period", ["semester", "year"])
    .index("by_student_date", ["studentId", "date"])
    .index("by_program_period", ["programId", "semester", "year"])
    .index("by_lecturer_period", ["lecturerId", "semester", "year"]),





  // ===== TIMETABLE =====

  timeSlots: defineTable({
    courseId: v.id("courses"),
    day: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    lecturerId: v.optional(v.id("users")),
    room: v.optional(v.string()),
    programId: v.optional(v.id("programs")),
    ...academicPeriodFields,
  })
    .index("by_course_period", ["courseId", "semester", "year"])
    .index("by_lecturer_period", ["lecturerId", "semester", "year"])
    .index("by_period", ["semester", "year"])
    .index("by_program_period", ["programId", "semester", "year"]),

  timetableConfigs: defineTable({
    days: v.array(v.string()),
    periods: v.array(v.object({
      id: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      label: v.optional(v.string()),
    })),
    semester: v.number(),
    year: v.number(),
    updatedAt: v.number(),
  })
    .index("by_period", ["semester", "year"]),

  // ===== PAYROLL =====

  payroll: defineTable({
    staffId: v.id("users"),
    month: v.string(),
    year: v.number(),
    semester: v.optional(v.number()),
    baseSalary: v.number(),
    allowances: v.number(),
    deductions: v.number(),
    netPay: v.number(),
    amountPaid: v.optional(v.number()),
    carryOverBalance: v.optional(v.number()),
    status: v.union(v.literal("Pending"), v.literal("Finished")),
    paymentDate: v.optional(v.string()),
  })
    .index("by_staff", ["staffId"])
    .index("by_year", ["year"])
    .index("by_period", ["month", "year"])
    .index("by_staff_period", ["staffId", "month", "year"])
    .index("by_semester_year", ["semester", "year"])
    .index("by_staff_semester_year", ["staffId", "semester", "year"]),

  payrollPayments: defineTable({
    payrollId: v.id("payroll"),
    amount: v.number(),
    date: v.string(),
    method: v.optional(v.union(
      v.literal("CASH"),
      v.literal("BANK"),
      v.literal("BANK_SLIP"),
      v.literal("MOBILE_MONEY"),
    )),
    notes: v.optional(v.string()),
    receiptNumber: v.optional(v.string()),
    recordedBy: v.id("users"),
  })
    .index("by_payroll", ["payrollId"])
    .index("by_date", ["date"]),

  // ===== EMERGENCY CONTACTS =====

  emergencyContacts: defineTable({
    name: v.string(),
    relationship: v.string(),
    contact: v.string(),
    email: v.optional(v.string()),
    userId: v.optional(v.id("users")), // If they have a system account
  }).index("by_user", ["userId"])
    .searchIndex("search_contacts", {
      searchField: "name",
    }),

  // ===== ADMISSIONS =====

  applicants: defineTable({
    applicantName: v.string(),
    contact: v.string(),
    targetProgramId: v.id("programs"),
    stage: v.union(v.literal("New"), v.literal("Interview"), v.literal("Admitted"), v.literal("Rejected"), v.literal("Enrolled")),
    dateApplied: v.string(),
    gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    dateOfBirth: v.optional(v.string()),
    notes: v.optional(v.string()),
    semester: v.number(),
    year: v.number(),
    priorEducation: v.optional(v.string()),
  }).index("by_stage", ["stage"])
    .index("by_targetProgram", ["targetProgramId"])
    .index("by_period", ["semester", "year"])
    .index("by_stage_period", ["stage", "semester", "year"])
    .searchIndex("search_name", {
      searchField: "applicantName",
      filterFields: ["stage", "targetProgramId", "semester", "year"],
    }),

  // ===== FACULTIES (Consolidated structure) =====
  faculties: defineTable({
    name: v.string(), // e.g. Faculty of Computer Science
    deanId: v.optional(v.id("users")), // Replaces HOD
    courses: v.optional(v.array(v.id("courses"))),
    status: v.union(v.literal("Active"), v.literal("Inactive")),
  })
    .index("by_status", ["status"])
    .index("by_dean", ["deanId"]),

  courseAllocations: defineTable({
    lecturerId: v.id("users"),
    courseId: v.id("courses"),
    programId: v.id("programs"),
    year: v.number(),
    semester: v.number(),
  })
    .index("by_lecturer", ["lecturerId"])
    .index("by_lecturer_period", ["lecturerId", "year", "semester"])
    .index("by_course", ["courseId"])
    .index("by_period", ["year", "semester"])
    .index("by_program_period", ["programId", "year", "semester"]),

  assessmentConfigs: defineTable({
    lecturerId: v.id("users"),
    courseId: v.id("courses"),
    semester: v.number(),
    year: v.number(),
    columns: v.array(v.object({
      id: v.string(),
      label: v.string(),
      maxMarks: v.number(),
      weight: v.number(),
      includeInFinal: v.boolean(),
      deadline: v.optional(v.string()),
    })),
    status: v.union(v.literal("Active"), v.literal("Locked")),
  })
    .index("by_lecturer_course", ["lecturerId", "courseId", "semester", "year"]),

  // ===== AI TOOLS =====

  // ===== AUDIT LOGS =====

  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_resource", ["resource"])
    .index("by_resource_timestamp", ["resource", "timestamp"]),

  rateLimits: defineTable({
    key: v.string(),
    timestamp: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_timestamp", ["timestamp"]),

  permissionDefinitions: defineTable({
    key: v.string(),
    module: v.string(),
    functionality: v.string(),
    action: v.string(),
    label: v.string(),
    type: v.union(v.literal("page"), v.literal("action")),
    description: v.optional(v.string()),
    parentKeys: v.optional(v.array(v.string())),
  }).index("by_module", ["module"])
    .index("by_functionality", ["functionality"])
    .index("by_key", ["key"]),

  studentSemesterSnapshots: defineTable({
    semester: v.number(),
    year: v.number(),
    studentId: v.id("students"),
    programId: v.id("programs"),
    status: v.string(),
    createdAt: v.number(),
  })
    .index("by_period", ["semester", "year"])
    .index("by_student_period", ["studentId", "semester", "year"]),

  semesterDeferrals: defineTable({
    studentId: v.id("students"),
    programId: v.id("programs"),
    semester: v.number(),
    year: v.number(),
    reason: v.string(),
    approvedBy: v.id("users"),
    status: v.union(v.literal("Pending"), v.literal("Approved"), v.literal("Expired")),
    createdAt: v.number(),
    returnDate: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_period", ["semester", "year"]),

  missedExams: defineTable({
    studentId: v.id("students"),
    courseId: v.id("courses"),
    semester: v.number(),
    year: v.number(),
    reason: v.string(),
    hasSupportingDocs: v.boolean(),
    status: v.union(v.literal("Pending"), v.literal("Approved"), v.literal("Rejected"), v.literal("Sitting Supplemental")),
    sittingDate: v.optional(v.string()),
    recordedBy: v.id("users"),
  })
    .index("by_student", ["studentId"])
    .index("by_course_period", ["courseId", "semester", "year"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    subscription: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ===== LEARNING MANAGEMENT SYSTEM (LMS) =====

  courseModules: defineTable({
    courseId: v.id("courses"),
    title: v.string(), // e.g. "Week 1: Intro to AI"
    description: v.optional(v.string()),
    order: v.number(),
    isPublished: v.boolean(),
    ...academicPeriodFields,
  }).index("by_course", ["courseId"]),

  courseMaterials: defineTable({
    moduleId: v.id("courseModules"),
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("pdf"), v.literal("video"), v.literal("document"), v.literal("link"), v.literal("audio")),
    fileUrl: v.string(), 
    fileSize: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    uploadedBy: v.id("users"),
    isPublished: v.boolean(),
    order: v.number(),
  }).index("by_module", ["moduleId"]),

  materialViews: defineTable({
    materialId: v.id("courseMaterials"),
    studentId: v.id("students"),
    viewedAt: v.number(),
  }).index("by_material_student", ["materialId", "studentId"])
    .index("by_student", ["studentId"]),

  courseAssignments: defineTable({
    moduleId: v.id("courseModules"),
    courseId: v.id("courses"),
    title: v.string(),
    instructions: v.string(),
    maxScore: v.number(),
    dueDate: v.number(), // Timestamp
    attachmentUrl: v.optional(v.string()), 
    isPublished: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_course", ["courseId"])
    .index("by_module", ["moduleId"]),

  studentSubmissions: defineTable({
    assignmentId: v.id("courseAssignments"),
    studentId: v.id("students"),
    courseId: v.id("courses"),
    submittedAt: v.number(),
    fileUrl: v.optional(v.string()), 
    textResponse: v.optional(v.string()),
    earnedScore: v.optional(v.number()),
    lecturerFeedback: v.optional(v.string()),
    gradedBy: v.optional(v.id("users")),
    status: v.union(v.literal("Draft"), v.literal("Submitted"), v.literal("Graded")),
  }).index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_student", ["assignmentId", "studentId"]),

  courseDiscussions: defineTable({
    courseId: v.id("courses"),
    moduleId: v.optional(v.id("courseModules")),
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    createdAt: v.number(),
    isPinned: v.optional(v.boolean()),
  }).index("by_course", ["courseId"])
    .index("by_module", ["moduleId"]),

  discussionReplies: defineTable({
    discussionId: v.id("courseDiscussions"),
    content: v.string(),
    authorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_discussion", ["discussionId"]),

  newsAnnouncements: defineTable({
    title: v.string(),
    content: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent")),
    targetAudience: v.union(v.literal("all"), v.literal("students"), v.literal("staff"), v.literal("specific_program")),
    targetProgramIds: v.optional(v.array(v.id("programs"))),
    attachmentUrl: v.optional(v.string()),
    publishDate: v.number(),
    expiryDate: v.optional(v.number()),
    isActive: v.boolean(),
    authorId: v.id("users"),
  }).index("by_publishDate", ["publishDate"])
    .index("by_target_audience", ["targetAudience"]),

  // ===== LEGACY / TEMPLATE TABLES =====
  conversations: defineTable({
    status: v.union(v.literal("unresolved"), v.literal("escalated"), v.literal("resolved")),
    contactSessionId: v.optional(v.id("emergencyContacts")), // Example linking
    lastMessageText: v.optional(v.string()),
  }).index("by_status", ["status"]),

  messages: defineTable({
    conversationId: v.optional(v.id("conversations")),
    senderId: v.id("users"),
    text: v.optional(v.string()),
    content: v.optional(v.string()),
    subject: v.optional(v.string()),
    recipients: v.optional(v.string()),
    type: v.optional(v.union(v.literal("SMS"), v.literal("Email"))),
    status: v.optional(v.string()),
    date: v.optional(v.string()),
    semester: v.optional(v.number()),
    year: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  }).index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

  borrowRecords: defineTable({
    borrowerId: v.id("students"),
    item: v.optional(v.string()),
    ...academicPeriodFields,
  }).index("by_borrower_period", ["borrowerId", "semester", "year"]),

  channels: defineTable({
    name: v.string(),
  }),
});

/**
 * SINGLE SOURCE OF TRUTH for all permissions in the system.
 * This file is shared between the backend (for seeding) and the frontend (for logic/guards).
 */

export interface PermissionDefinition {
    key: string;
    module: string;
    functionality: string;
    action: string;
    label: string;
    description: string;
    parentKeys?: string[];
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    // --- OVERVIEW ---
    // --- EVENTS (CALENDAR) ---
    { key: "access:events:manage", module: "Overview", functionality: "Calendar", action: "manage", label: "Events Management", description: "Create, edit, and delete events on the school calendar." },

    // --- ACADEMIC ---
    { key: "access:timetable:manage", module: "Academic", functionality: "Timetable", action: "manage", label: "Manage Slots", description: "Create and edit timetable slots." },
    { key: "access:timetable:settings", module: "Academic", functionality: "Timetable", action: "manage", label: "Configuration", description: "Configure days and periods." },

    { key: "access:allocations:courses", module: "Academic", functionality: "Allocations", action: "view", label: "Course Allocation", description: "Manage course assignments to lecturers." },
    { key: "access:allocations:courses:manage", module: "Academic", functionality: "Allocations", action: "manage", label: "Action Control", description: "Assign lecturers to courses.", parentKeys: ["access:allocations:courses"] },

    { key: "access:allocations:program_coordinators", module: "Academic", functionality: "Allocations", action: "view", label: "Program Coordinators", description: "Assign program coordinators." },
    { key: "access:allocations:program_coordinators:manage", module: "Academic", functionality: "Allocations", action: "manage", label: "Action Control", description: "Assign coordinators to programs.", parentKeys: ["access:allocations:program_coordinators"] },

    { key: "access:allocations:analytics", module: "Academic", functionality: "Allocations", action: "view", label: "Allocations Analytics", description: "View allocation summaries." },
    { key: "access:oversight:academic_registrar", module: "Academic", functionality: "Oversight", action: "view", label: "Global Academic Oversight", description: "Read-only access to all programs, courses, and analytics (University Head/Registrar)." },

    { key: "access:ai-tools", module: "Academic", functionality: "AI Tools", action: "view", label: "AI Tools Access", description: "Access AI assistants." },
    { key: "access:ai-tools:lesson-planner", module: "Academic", functionality: "AI Tools", action: "view", label: "Lesson Planner", description: "Access the AI Lesson Planner.", parentKeys: ["access:ai-tools"] },
    { key: "access:ai-tools:exam-generator", module: "Academic", functionality: "AI Tools", action: "view", label: "Exam Generator", description: "Access the AI Exam Generator.", parentKeys: ["access:ai-tools"] },
    { key: "access:ai-tools:circular-writer", module: "Academic", functionality: "AI Tools", action: "view", label: "Circular Writer", description: "Access the AI Circular Writer.", parentKeys: ["access:ai-tools"] },
    { key: "access:ai-tools:history", module: "Academic", functionality: "AI Tools", action: "view", label: "AI History", description: "View previous AI generations.", parentKeys: ["access:ai-tools"] },
    { key: "access:ai-tools:billing", module: "Academic", functionality: "AI Tools", action: "manage", label: "Manage AI Billing", description: "Access and manage AI credits.", parentKeys: ["access:ai-tools"] },
    { key: "ai-tools:use", module: "Academic", functionality: "AI Tools", action: "use", label: "Use AI Tools", description: "Use AI for school tasks." },



    // --- FINANCE ---
    { key: "access:finance:transactions", module: "Finance", functionality: "Finance", action: "view", label: "Income Access", description: "View transactions and receipts." },
    { key: "access:finance:defaulters", module: "Finance", functionality: "Finance", action: "view", label: "Fees Access", description: "View student payment lists (pending and fully paid)." },
    { key: "access:finance:fees", module: "Finance", functionality: "Finance", action: "view", label: "Fee Structures Access", description: "View fee structures and other fees." },
    { key: "access:sickbay:registry", module: "Operations", functionality: "Sickbay", action: "view", label: "Medical Registry", description: "View student clinical visits and health records." },
    { key: "access:sickbay:analytics", module: "Operations", functionality: "Sickbay", action: "view", label: "Health Analytics", description: "View medical trends and health insights." },
    { key: "access:sickbay:manage", module: "Operations", functionality: "Sickbay", action: "manage", label: "Action Control", description: "Record new medical entries and manage referrals.", parentKeys: ["access:sickbay:registry"] },

    { key: "access:finance:expenses", module: "Finance", functionality: "Finance", action: "view", label: "Expenses Access", description: "View school spending records." },
    { key: "access:finance:analytics", module: "Finance", functionality: "Finance", action: "view", label: "Finance Analytics", description: "View financial trends and summaries." },

    { key: "access:finance:transactions:manage", module: "Finance", functionality: "Finance", action: "manage", label: "Action Control", description: "Record payments.", parentKeys: ["access:finance:transactions"] },
    { key: "access:finance:defaulters:manage", module: "Finance", functionality: "Finance", action: "manage", label: "Fees: Student Actions", description: "Record payments and student-specific actions.", parentKeys: ["access:finance:defaulters"] },
    { key: "access:finance:expenses:manage", module: "Finance", functionality: "Finance", action: "manage", label: "Record Expenses", description: "Record school spending.", parentKeys: ["access:finance:expenses"] },
    
    // Detailed Fees Permissions
    { key: "access:finance:fees:view_pending", module: "Finance", functionality: "Finance", action: "view", label: "View Pending Fees", description: "Access the 'Pending' fees sub-tab.", parentKeys: ["access:finance:defaulters"] },
    { key: "access:finance:fees:view_paid", module: "Finance", functionality: "Finance", action: "view", label: "View Fully Paid", description: "Access the 'Fully Paid' fees sub-tab.", parentKeys: ["access:finance:defaulters"] },
    { key: "access:finance:fees:edit_history", module: "Finance", functionality: "Finance", action: "manage", label: "Edit Payment History", description: "Allow modifying existing fee payments (Sensitive).", parentKeys: ["access:finance:defaulters"] },

    { key: "access:payroll:registry", module: "Finance", functionality: "Payroll", action: "view", label: "Registry", description: "Access staff salary records and processing history." },
    { key: "access:payroll:analytics", module: "Finance", functionality: "Payroll", action: "view", label: "Analytics", description: "View payroll summaries and financial graphs." },
    { key: "access:payroll:manage", module: "Finance", functionality: "Payroll", action: "manage", label: "Action Control", description: "Control actions like run payroll, new entry and record payments.", parentKeys: ["access:payroll:registry"] },

    // --- STUDENTS ---
    { key: "access:students:active", module: "Students", functionality: "Students", action: "view", label: "Registry Access", description: "View active student enrolment." },
    { key: "access:students:inactive", module: "Students", functionality: "Students", action: "view", label: "Archived Records Access", description: "View inactive student files." },
    { key: "access:students:analytics", module: "Students", functionality: "Students", action: "view", label: "Analytics Access", description: "View student population insights." },

    { key: "access:students:active:manage", module: "Students", functionality: "Students", action: "manage", label: "Action Control", description: "Manage student registry.", parentKeys: ["access:students:active"] },
    { key: "access:students:inactive:manage", module: "Students", functionality: "Students", action: "manage", label: "Action Control", description: "Manage archived student records.", parentKeys: ["access:students:inactive"] },

    // --- ADMISSIONS ---
    { key: "access:admissions:registry", module: "Admissions", functionality: "Admissions", action: "view", label: "Registry Access", description: "View applicant enrolment." },
    { key: "access:admissions:registration", module: "Admissions", functionality: "Admissions", action: "view", label: "Registration Access", description: "Access applicant registration interface." },
    { key: "access:admissions:analytics", module: "Admissions", functionality: "Admissions", action: "view", label: "Ads Analytics Access", description: "View admissions population insights." },

    { key: "access:admissions:registry:manage", module: "Admissions", functionality: "Admissions", action: "manage", label: "Action Control", description: "Manage applicant records and enrollment workflow.", parentKeys: ["access:admissions:registry"] },
    { key: "access:admissions:registration:manage", module: "Admissions", functionality: "Admissions", action: "manage", label: "Action Control", description: "Register new applicants.", parentKeys: ["access:admissions:registration"] },

    // --- EMERGENCY CONTACTS ---
    { key: "access:emergency_contacts", module: "Students", functionality: "Emergency Contacts", action: "view", label: "Registry Access", description: "View student emergency contact profiles." },
    { key: "access:emergency_contacts:analytics", module: "Students", functionality: "Emergency Contacts", action: "view", label: "Analytics Access", description: "View contact-related insights." },
    { key: "access:emergency_contacts:manage", module: "Students", functionality: "Emergency Contacts", action: "manage", label: "Action Control", description: "Manage emergency contact records.", parentKeys: ["access:emergency_contacts"] },

    // --- STAFF DIRECTORY ---
    { key: "access:staff:active", module: "Staff Directory", functionality: "Staff Directory", action: "view", label: "Active Personnel Access", description: "View active staff members." },
    { key: "access:staff:inactive", module: "Staff Directory", functionality: "Staff Directory", action: "view", label: "Inactive Personnel Access", description: "View deactivated records." },
    { key: "access:staff:analytics", module: "Staff Directory", functionality: "Staff Directory", action: "view", label: "Personnel Analytics Access", description: "View staff-related insights." },

    { key: "access:staff:active:manage", module: "Staff Directory", functionality: "Staff Directory", action: "manage", label: "Action Control", description: "Manage staff records.", parentKeys: ["access:staff:active"] },
    { key: "access:staff:inactive:manage", module: "Staff Directory", functionality: "Staff Directory", action: "manage", label: "Action Control", description: "Manage inactive staff records (activate/reactivate).", parentKeys: ["access:staff:inactive"] },

    // --- REPORTS ---
    { key: "access:reports", module: "Administration", functionality: "Reports", action: "view", label: "Reports Access", description: "Access school reports." },
    { key: "access:reports:view", module: "Administration", functionality: "Reports", action: "view", label: "See Reports", description: "View and print reports.", parentKeys: ["access:reports"] },

    // --- LIBRARY ---
    { key: "access:library:analytics", module: "Library", functionality: "Library", action: "view", label: "Analytics", description: "View library usage and statistics." },
    { key: "access:library:catalog", module: "Library", functionality: "Library", action: "view", label: "Catalog", description: "Browse and manage book catalog." },
    { key: "access:library:borrowed", module: "Library", functionality: "Library", action: "view", label: "Borrowed Records", description: "View and manage active book loans." },
    { key: "access:library:issue", module: "Library", functionality: "Library", action: "manage", label: "Issue Book", description: "Process new book issuances." },
    { key: "access:library:catalog:manage", module: "Library", functionality: "Library", action: "manage", label: "Action Control", description: "Manage book catalog.", parentKeys: ["access:library:catalog"] },
    { key: "access:library:issue:manage", module: "Library", functionality: "Library", action: "manage", label: "Action Control", description: "Process loans and returns.", parentKeys: ["access:library:issue"] },

    // --- INVENTORY ---
    { key: "access:inventory:stock", module: "Inventory", functionality: "Inventory", action: "view", label: "Stock Registry Access", description: "Access inventory stock records." },
    { key: "access:inventory:issuance", module: "Inventory", functionality: "Inventory", action: "view", label: "Issuance & Returns Access", description: "Access inventory issuance and return records." },
    { key: "access:inventory:history", module: "Inventory", functionality: "Inventory", action: "view", label: "History Access", description: "Access inventory return history." },
    { key: "access:inventory:analytics", module: "Inventory", functionality: "Inventory", action: "view", label: "Analytics Access", description: "View inventory usage analytics." },
    { key: "access:inventory:stock:manage", module: "Inventory", functionality: "Inventory", action: "manage", label: "Action Control", description: "Manage stock items.", parentKeys: ["access:inventory:stock"] },
    { key: "access:inventory:issuance:manage", module: "Inventory", functionality: "Inventory", action: "manage", label: "Action Control", description: "Issue and return items.", parentKeys: ["access:inventory:issuance"] },


    // --- DISCIPLINE ---
    { key: "access:discipline:my-incidents", module: "Discipline", functionality: "Discipline", action: "view", label: "My Incidents", description: "View incidents reported by you." },
    { key: "access:discipline:all-incidents", module: "Discipline", functionality: "Discipline", action: "view", label: "All Incidents", description: "View all incidents reported by staff." },

    { key: "manage:discipline:incidents", module: "Discipline", functionality: "Discipline", action: "manage", label: "Action Control", description: "Create, edit, and delete incidents.", parentKeys: ["access:discipline:my-incidents"] },

    { key: "access:discipline:actions", module: "Discipline", functionality: "Discipline", action: "view", label: "Suspensions & Expulsions", description: "View formal disciplinary actions." },
    { key: "manage:discipline:actions", module: "Discipline", functionality: "Discipline", action: "manage", label: "Action Control", description: "Log and manage suspensions/expulsions.", parentKeys: ["access:discipline:actions"] },

    { key: "access:discipline:analytics", module: "Discipline", functionality: "Discipline", action: "view", label: "Analytics", description: "View discipline trends and AI insights." },


    // --- SYSTEM ---
    { key: "access:system:permissions:manage", module: "System", functionality: "Permissions", action: "manage", label: "Manage Permissions", description: "Access and manage staff permissions." },

    { key: "access:attendance:register", module: "Academic", functionality: "Attendance", action: "view", label: "Attendance Register", description: "Access and mark attendance for sessions." },
    { key: "access:attendance:analytics", module: "Academic", functionality: "Attendance", action: "view", label: "Attendance Analytics", description: "View attendance trends and summaries." },

    { key: "access:master-data:programs", module: "System", functionality: "Master Data", action: "view", label: "Programs & Specializations", description: "View university programs and degree settings." },
    { key: "manage:master-data:programs", module: "System", functionality: "Master Data", action: "manage", label: "Action Control", description: "Create and edit programs.", parentKeys: ["access:master-data:programs"] },

    { key: "access:master-data:courses", module: "System", functionality: "Master Data", action: "view", label: "Curriculum & Courses", description: "View university courses." },
    { key: "manage:master-data:courses", module: "System", functionality: "Master Data", action: "manage", label: "Action Control", description: "Manage curriculum and courses.", parentKeys: ["access:master-data:courses"] },

    { key: "access:master-data:departments", module: "System", functionality: "Master Data", action: "view", label: "Departments", description: "View school departments." },
    { key: "manage:master-data:departments", module: "System", functionality: "Master Data", action: "manage", label: "Action Control", description: "Manage school departments.", parentKeys: ["access:master-data:departments"] },

    { key: "access:master-data:fees", module: "System", functionality: "Master Data", action: "view", label: "Fee Structures", description: "View tuition and semester fees." },
    { key: "manage:master-data:fees", module: "System", functionality: "Master Data", action: "manage", label: "Action Control", description: "Manage fee structures.", parentKeys: ["access:master-data:fees"] },

    { key: "access:master-data:roles", module: "System", functionality: "Master Data", action: "view", label: "System Roles", description: "View staff and system roles." },
    { key: "manage:master-data:roles", module: "System", functionality: "Master Data", action: "manage", label: "Action Control", description: "Configure system roles.", parentKeys: ["access:master-data:roles"] },


    { key: "access:system:settings:school", module: "Settings", functionality: "Settings", action: "manage", label: "School Config", description: "Manage school-wide configuration." },
    { key: "manage:system:settings:academic_year", module: "Settings", functionality: "Settings", action: "manage", label: "Academic Year Management", description: "Advance semesters and manage promotions." },

    { key: "access:system:audit-logs", module: "System", functionality: "Audit Logs", action: "view", label: "Audit Logs Access", description: "View system audit trail." },
    
    // --- STUDENT PORTAL ---
    { key: "access:student:portal", module: "Student Portal", functionality: "Dashboard", action: "view", label: "Portal Access", description: "Access the student-facing portal." },
    { key: "access:student:results", module: "Student Portal", functionality: "Academic", action: "view", label: "View Results", description: "Access course marks and transcripts.", parentKeys: ["access:student:portal"] },
    { key: "access:student:finance", module: "Student Portal", functionality: "Finance", action: "view", label: "View Ledger", description: "Access personal fee statements and receipts.", parentKeys: ["access:student:portal"] },
];

export const LEGACY_MAPPINGS: Record<string, string[]> = {
    // --- FINANCE BRIDGES ---
    "access:finance": ["access:finance:transactions", "access:finance:defaulters", "access:finance:fees", "access:finance:expenses", "access:finance:analytics"],
    "finance:transactions:manage": ["access:finance:transactions:manage"],
    "finance:defaulters:actions": ["access:finance:defaulters:manage"],
    "finance:expenses:manage": ["access:finance:expenses:manage"],
    "finance:manage_fees": ["access:finance:transactions:manage", "access:finance:defaulters:manage"],
    "finance:manage_expenses": ["access:finance:expenses:manage"],
    "access:payroll": ["access:payroll:registry", "access:finance:payroll:manage", "payroll:manage"],
    "payroll:manage": ["access:payroll:manage"],
    "access:payroll:manage": ["access:finance:payroll:manage", "payroll:manage"],
    "access:finance:payroll:manage": ["access:payroll:manage"],

    // --- ACADEMIC BRIDGES ---
    "access:timetable": [],
    "timetable:manage": ["access:timetable:manage"],
    // "attendance:manage": ["access:attendance:analytics"],

    // --- STUDENT BRIDGES ---
    "access:students": ["access:students:active", "access:students:inactive", "access:students:analytics"],
    "students:active:create": ["access:students:active:manage"],
    "students:active:edit": ["access:students:active:manage"],
    "students:active:delete": ["access:students:active:manage"],
    "students:active:promote": ["access:students:active:manage"],
    "students:active:view_dossier": ["access:students:active"],
    "students:inactive:edit": ["access:students:inactive:manage"],
    "students:inactive:delete": ["access:students:inactive:manage"],

    "access:students:active:create": ["access:students:active:manage"],
    "access:students:active:edit": ["access:students:active:manage"],
    "access:students:active:delete": ["access:students:active:manage"],
    "access:students:active:promote": ["access:students:active:manage"],
    "access:students:inactive:edit": ["access:students:inactive:manage"],
    "access:students:inactive:delete": ["access:students:inactive:manage"],

    // --- PARENTS BRIDGES ---
    "access:sickbay": ["access:sickbay:registry", "access:sickbay:analytics", "access:sickbay:manage"],
    "access:sickbay:records": ["access:sickbay:registry"],
    "access:sickbay:manage": ["manage:sickbay:records", "sickbay:manage"],
    "sickbay:manage": ["access:sickbay:manage"],
    "parents:active:create": ["access:parents:active:manage"],
    "parents:active:edit": ["access:parents:active:manage"],
    "parents:active:delete": ["access:parents:active:manage"],

    "access:parents:active:create": ["access:parents:active:manage"],
    "access:parents:active:edit": ["access:parents:active:manage"],
    "access:parents:active:delete": ["access:parents:active:manage"],
    "access:staff": ["access:staff:active", "access:staff:inactive", "access:staff:analytics"],
    "staff:active:create": ["access:staff:active:manage"],
    "staff:active:actions": ["access:staff:active:manage"],
    "staff:active:manage_status": ["access:staff:active:manage", "access:staff:inactive:manage"],
    "staff:active:delete": ["access:staff:active:manage"],
    "staff:active:view_dossier": ["access:staff:active"],

    "staff:manage": ["access:staff:active:manage", "access:staff:inactive:manage"],
    "access:staff:active:create": ["access:staff:active:manage"],
    "access:staff:active:edit": ["access:staff:active:manage"],
    "access:staff:active:delete": ["access:staff:active:manage"],
    "access:staff:active:view_dossier": ["access:staff:active"],
    "access:staff:active:manage_status": ["access:staff:active:manage", "access:staff:inactive:manage"],

    // --- EVENTS BRIDGES ---
    "events:manage": ["access:events:manage"],
    "access:overview:calendar:manage": ["access:events:manage"],
    "access:events:new": ["access:events:manage"],
    "access:events:upcoming:manage": ["access:events:manage"],
    "access:events:completed:manage": ["access:events:manage"],

    // --- ADMISSION BRIDGES ---
    "access:admissions": ["access:admissions:registry", "access:admissions:registration", "access:admissions:analytics"],
    "admissions:registration:create": ["access:admissions:registration:manage"],
    "admissions:registry:actions": ["access:admissions:registry:manage"],
    "admissions:registry:approve": ["access:admissions:registry:manage"],
    "admissions:registry:enroll": ["access:admissions:registry:manage"],
    "admissions:registry:delete": ["access:admissions:registry:manage"],

    "admissions:create": ["access:admissions:registration:manage"],
    "admissions:edit": ["access:admissions:registry:manage"],
    "admissions:delete": ["access:admissions:registry:manage"],
    "admissions:approve": ["access:admissions:registry:manage"],
    "admissions:enroll": ["access:admissions:registry:manage"],

    // --- LIBRARY & INVENTORY ---
    "access:library": ["access:library:analytics", "access:library:catalog", "access:library:borrowed", "access:library:issue"],
    "library:catalog:manage": ["access:library:catalog:manage"],
    "library:catalog:actions": ["access:library:catalog:manage"],
    "library:issue:actions": ["access:library:issue:manage"],
    "access:inventory": ["access:inventory:stock", "access:inventory:issuance", "access:inventory:history", "access:inventory:analytics"],
    "inventory:stock:actions": ["access:inventory:stock:manage"],
    "inventory:issuance:actions": ["access:inventory:issuance:manage"],
    "inventory:assignments:actions": ["access:inventory:issuance:manage"],
    "access:inventory:assignments": ["access:inventory:issuance"],
    "access:inventory:assignments:manage": ["access:inventory:issuance:manage"],
    "inventory:manage": ["access:inventory:stock:manage", "access:inventory:issuance:manage"],

    // --- DISCIPLINE BRIDGES ---
    "access:discipline:my_incidents": ["access:discipline:my-incidents"],
    "access:discipline:all_incidents": ["access:discipline:all-incidents"],
    "discipline:my_incidents": ["access:discipline:my-incidents"],
    "discipline:all_incidents": ["access:discipline:all-incidents"],
    "access:discipline:actions": ["access:discipline:actions", "manage:discipline:actions"],
    "access:discipline:analytics": ["access:discipline:analytics"],

    // --- SYSTEM ---
    "permissions:manage": ["access:system:permissions:manage"],
    "master-data:manage_programs": ["access:master-data:programs", "manage:master-data:programs"],
    "master-data:manage_courses": ["access:master-data:courses", "manage:master-data:courses"],
    "master-data:manage_departments": ["access:master-data:departments", "manage:master-data:departments"],
    "master-data:manage_fee_structures": ["access:master-data:fees", "manage:master-data:fees"],
    "master-data:manage_other_fees": ["access:master-data:fees", "manage:master-data:fees"],
    "master-data:manage_roles": ["access:master-data:roles", "manage:master-data:roles"],
    "master-data:manage_dormitories": ["access:boarding", "boarding:manage"],
    "boarding:manage_dormitories": ["boarding:manage"],
    "boarding:assign_students": ["boarding:manage"],
    "access:boarding:dormitories": ["access:boarding"],
    "access:boarding:assignments": ["access:boarding"],

    // --- REVERSE BRIDGES (Restore access for legacy keys) ---
    "access:master-data:programs": ["master-data:manage_programs"],
    "access:master-data:courses": ["master-data:manage_courses"],
    "access:master-data:departments": ["master-data:manage_departments"],
    "access:master-data:fees": ["master-data:manage_fee_structures", "master-data:manage_other_fees"],
    "access:master-data:roles": ["master-data:manage_roles"],

    "settings:manage": ["access:system:settings:school"],
    "settings:academic_year": ["access:system:settings:academic_year"],
};

export const STAFF_DEFAULTS: string[] = [];

export const ALL_PERMISSION_KEYS = new Set(PERMISSION_DEFINITIONS.map(d => d.key));

# 🏛️ ECU Admin Panel — Comprehensive Blueprint

> **Emmanuel Christian University** — Goli, Yei River County, Central Equatoria State, South Sudan
> Primary colour: **Maroon** (`#800000`) · Design system: **shadcn/ui** · Theme: **Dark + Light (next-themes)**

---

## 1. About Emmanuel Christian University

Emmanuel Christian University (ECU) was established in **2001** by Open Doors Africa Services in partnership with the Evangelical Presbyterian Church (EPC). Located 120 miles west of Juba in lush South Sudan, ECU combines transformative academic education with Biblical holistic development.

### 3 Faculties

| Faculty | Programs |
|---------|----------|
| **Theology** | BA in Theology · Diploma in Theology · Certificate in Theology |
| **Education & Community Development** | BEd (Maths & IT) · BSc Social Works · BEd (Geography & English) · Diploma in Education · Diploma in Social Works · Certificate in Education |
| **Business & Leadership Development** | BBA · BPA · Diploma in Business Admin · Diploma in Leadership & Mgt · Certificate in Business Admin · Certificate in Leadership & Mgt · Certificate in IT |

### Contact
- 📞 +211 921 145 838 / +211 926 132 439
- 📧 info@ecu-ssd.org / admissions@ecu-ssd.org
- 🕐 Mon–Fri 8AM–5PM · Sat 9AM–12PM · Sun Closed

---

## 2. Design System & Theming

### Primary Colour Token (Maroon)

The ECU brand colour is **maroon**. All shadcn CSS variables should be overridden:

```css
/* globals.css — Light mode */
:root {
  --primary: 0 100% 25%;          /* #800000 maroon */
  --primary-foreground: 0 0% 100%;
  --ring: 0 100% 25%;
}

/* Dark mode */
.dark {
  --primary: 0 72% 45%;           /* slightly lighter maroon for contrast */
  --primary-foreground: 0 0% 100%;
  --ring: 0 72% 45%;
}
```

### Dark / Light Mode (shadcn + next-themes)

**Implementation steps** (already supported in your Next.js + shadcn monorepo):

```
Step 1 — Install:
  pnpm add next-themes --filter @repo/staff-portal

Step 2 — Create theme provider:
  apps/staff-portal/components/providers/theme-provider.tsx

Step 3 — Wrap root layout:
  apps/staff-portal/app/layout.tsx
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>

Step 4 — Add ModeToggle to admin sidebar footer:
  uses useTheme() from next-themes
  shows Sun / Moon / System icons via lucide-react
```

### Design Philosophy
- **No gradients** — flat, surface-based depth (shadcn `card`, `muted`, `accent` tokens)
- **No bright decorative colours** — maroon primary only for interactive/active states
- **Clean typography** — Inter font, weight 400/500/600 only
- **AI-style layout** — dense data tables, command palette, sidebar collapsible, breadcrumbs
- **Consistent spacing** — 4/8/12/16/24/32px rhythm
- **Icon set** — lucide-react exclusively

---

## 3. Admin Panel Architecture

### Role Hierarchy

```
┌─────────────────────────────────────────────┐
│               ROLE HIERARCHY                 │
│                                             │
│  Super Admin (Vice-Chancellor / Registrar)  │  ← Full system access
│         │                                   │
│         ├── Admin (Registrar Office)        │  ← Academic + student ops
│         │                                   │
│         ├── Dean                            │  ← Faculty-level oversight
│         │                                   │
│         ├── HOD (Head of Department)        │  ← Department + marks approval
│         │                                   │
│         └── Staff (Lecturer / Finance)      │  ← Scoped task access
│                                             │
└─────────────────────────────────────────────┘
```

### Admin Panel Controls Everything Downstream

```
┌────────────────────────────────────────────────────────────┐
│                   ADMIN PANEL                               │
│                                                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Academic    │  │   Student    │  │     Finance      │  │
│  │  Structure   │  │   Records    │  │    Management    │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                │                   │             │
│         ▼                ▼                   ▼             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Staff Portal (Lecturers/HODs)              │  │
│  │   Attendance · Marks Entry · Course Allocation        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │        Student Portal (Read-Only Self-Service)        │  │
│  │   Results · Timetable · Fees · Course Registration    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Admin Sidebar Navigation Map

```
/admin
├── Overview (Dashboard)
│
├── Academic Structure
│   ├── Faculties
│   ├── Departments
│   └── Programs & Courses
│
├── Academic Calendar
│   ├── Academic Periods (Semesters)
│   └── Timetable Management
│
├── Admissions
│   ├── Applicant Pipeline
│   ├── Admission Letters
│   └── Enrollment Wizard
│
├── Students
│   ├── All Students
│   ├── Course Registrations
│   ├── Academic Standing
│   ├── Graduation Clearance
│   └── Alumni
│
├── Staff Management
│   ├── All Staff
│   ├── Roles & Permissions
│   └── Course Allocations
│
├── Marks & Assessments
│   ├── Assessment Overview
│   ├── HOD Review Queue
│   └── Supplementary Exams
│
├── Finance
│   ├── Fee Structures
│   ├── Student Financials
│   ├── Payment Records
│   └── Financial Reports
│
├── Library
│   └── Borrow Records
│
├── Reports
│   ├── Transcripts
│   ├── Academic Reports
│   └── Financial Reports
│
└── Settings
    ├── School Configuration
    ├── Grading Scale
    └── System Audit Log
```

---

## 5. Module-by-Module Admin Panel Blueprint

---

### 5.1 Overview Dashboard

**Route**: `/admin`

**Purpose**: High-level snapshot of the university's live state.

**Widgets / KPI Cards**:

| Card | Data Source |
|------|-------------|
| Total Active Students | `students` table, `status: "Active"` |
| Pending Applicants | `applicants` table, `stage: "New" / "Interview"` |
| Current Semester | `schoolConfig.currentSemester` |
| Outstanding Fees (Total) | Sum of all student `balance` fields |
| Staff Count | `users` table, `role: any` |
| Courses Running | `courseAllocations` for current semester |

**Charts**:
- Enrollment by Faculty (bar chart)
- Fee Collection vs Outstanding (donut chart)
- Applicant pipeline funnel (funnel chart)
- Student academic standing distribution (pie)

**Quick Actions**:
- `Advance Semester` button (triggers semester transition flow)
- `Add Applicant` shortcut
- `View HOD Review Queue` (marks pending approval)

---

### 5.2 Academic Structure

**Route**: `/admin/academic-structure`

This is the **foundational layer**. Everything else (students, courses, fees) references data created here.

#### 5.2.1 Faculties

**Route**: `/admin/academic-structure/faculties`

```
Faculties Admin Flow:
┌─────────────────────────────────────────────┐
│  LIST VIEW: Faculties Table                  │
│  Columns: Name · Description · Departments  │
│  Actions: Edit · View Departments           │
├─────────────────────────────────────────────┤
│  CREATE / EDIT:                             │
│  - Faculty Name                             │
│  - Description                              │
│  - Assign Dean (Staff picker)               │
└─────────────────────────────────────────────┘
```

**Downstream Impact**: Faculty links to Departments → Programs → Courses → Students.
Deleting a faculty is blocked if it has active programs.

**Real ECU Data to pre-seed**:
1. Faculty of Theology
2. Faculty of Education & Community Development
3. Faculty of Business & Leadership Development

#### 5.2.2 Departments

**Route**: `/admin/academic-structure/departments`

```
Departments Admin Flow:
┌─────────────────────────────────────────────┐
│  LIST VIEW: Departments Table               │
│  Grouped by: Faculty                        │
│  Columns: Name · Faculty · HOD · Programs   │
│  Actions: Edit · Assign HOD · View Programs │
├─────────────────────────────────────────────┤
│  CREATE / EDIT FORM:                        │
│  - Department Name                          │
│  - Faculty (select)                         │
│  - Assign HOD (staff picker — lecturers)    │
│  - Assign Dean (staff picker)               │
└─────────────────────────────────────────────┘
```

**Downstream Impact**:
- HOD assignment controls who can approve marks for courses in this department
- HOD sees all course submissions for their department in the HOD Review Queue

#### 5.2.3 Programs & Courses

**Route**: `/admin/academic-structure/programs`

```
Programs Admin Flow:
┌──────────────────────────────────────────────────┐
│  LIST VIEW: Programs Table                        │
│  Columns: Code · Name · Level · Dept · Duration   │
│  Actions: Edit · View Courses · Fee Structure     │
├──────────────────────────────────────────────────┤
│  CREATE PROGRAM:                                  │
│  - Program Code (e.g. BBA, BAT, BEDU-MIT)        │
│  - Full Name                                      │
│  - Level: Bachelor / Diploma / Certificate        │
│  - Department                                     │
│  - Duration (years): e.g. 4 for Bachelor         │
│  - Total Credit Hours Required                    │
│  - Admission Requirements (text / checkboxes)     │
└──────────────────────────────────────────────────┘

Program → Courses Subpage:
┌──────────────────────────────────────────────────┐
│  COURSES TABLE (for selected program)             │
│  Columns: Code · Name · Credit Hours · Year · Sem │
│  Filter: By Year of Study / By Semester           │
│  Actions: Add Course · Edit · Remove              │
├──────────────────────────────────────────────────┤
│  ADD/EDIT COURSE:                                 │
│  - Course Code (e.g. BBA 101)                    │
│  - Course Name                                    │
│  - Credit Hours                                   │
│  - Year of Study (1, 2, 3, 4)                    │
│  - Semester (1 or 2)                              │
│  - Type: Core / Elective / General                │
│  - Prerequisites (multi-select courses)           │
│  - Department (who owns this course)              │
└──────────────────────────────────────────────────┘
```

**Downstream Impact**:
- Courses created here appear in lecturer Course Allocation
- Courses are shown during Student Course Registration each semester
- Credit hours feed into GPA calculation

---

### 5.3 Academic Calendar

**Route**: `/admin/academic-calendar`

#### 5.3.1 Academic Periods (Semesters)

```
Academic Periods Flow:
┌──────────────────────────────────────────────────────┐
│  CURRENT ACTIVE PERIOD (Banner)                       │
│  Semester 1 · 2026 · Status: Active                  │
│  Started: 1 Aug 2026 · Ends: 15 Dec 2026             │
├──────────────────────────────────────────────────────┤
│  ADVANCE SEMESTER (Primary CTA button)               │
│  → Opens confirmation modal showing:                  │
│     1. Current period → "Completed"                   │
│     2. New period created                             │
│     3. Fee rollover summary (how many students)       │
│     4. Checkbox: "Auto-create semester enrollments"   │
├──────────────────────────────────────────────────────┤
│  PERIOD HISTORY TABLE                                 │
│  Columns: Year · Semester · Status · Student Count   │
│           · Start Date · End Date · Actions           │
└──────────────────────────────────────────────────────┘
```

**Downstream Impact** when Advance Semester is triggered:
1. Fee rollover (balance carries forward + new semester fees added to all active students)
2. New `studentSemesterEnrollments` created for all active (non-deferred) students
3. `schoolConfig.currentSemester` updated globally
4. Student course registrations open for new semester
5. Deferred students are **SKIPPED** (no fee, no enrollment record)

#### 5.3.2 Timetable Management

**Route**: `/admin/academic-calendar/timetable`

```
Timetable Management Flow:
┌──────────────────────────────────────────────────────┐
│  FILTER BAR: Program · Year · Semester · Day         │
├──────────────────────────────────────────────────────┤
│  WEEKLY GRID VIEW                                     │
│  Rows: Time slots (7AM–7PM, 1-hour blocks)           │
│  Cols: Mon · Tue · Wed · Thu · Fri · Sat             │
│                                                       │
│  Each cell shows: Course · Room · Lecturer            │
│  Click cell → Edit time slot modal                   │
├──────────────────────────────────────────────────────┤
│  ADD TIME SLOT:                                       │
│  - Course (from courseAllocations for current sem)   │
│  - Day of week                                       │
│  - Start time / End time                             │
│  - Room / Location                                   │
│  - Lecturer (auto-filled from allocation)            │
└──────────────────────────────────────────────────────┘
```

**Downstream Impact**:
- Timetable appears on Student Portal "My Timetable"
- Timetable drives attendance session creation for lecturers

---

### 5.4 Admissions Module

**Route**: `/admin/admissions`

The full pipeline from prospect → enrolled student.

```
APPLICANT PIPELINE FLOW:
┌──────────────────────────────────────────────────────────┐
│                  PIPELINE KANBAN / TABLE                  │
│                                                          │
│  New    →   Interview   →   Admitted   →   Enrolled      │
│  (12)       (8)              (5)            (43 today)    │
│                                                          │
│  Each applicant card shows:                              │
│  - Full name                                             │
│  - Target Program                                        │
│  - Admission type: National / Direct                     │
│  - Date applied                                          │
│  - Action buttons: Move Stage · View · Reject            │
└──────────────────────────────────────────────────────────┘

Applicant Detail Page:
┌──────────────────────────────────────────────────────────┐
│  APPLICANT PROFILE                                        │
│  Personal Info: Name · DOB · Gender · Phone · Address    │
│  Target Program: BBA · Admission Type: National          │
│  Prior Education: SSCSE results (7 subjects required)    │
│  Documents: Checkbox list (verified / not verified)      │
│  Interview Notes (rich text)                             │
│                                                          │
│  STAGE ACTIONS:                                          │
│  [Move to Interview] [Admit] [Reject] [Enroll]           │
│                                                          │
│  ENROLLMENT TRIGGER (when "Enroll" is clicked):          │
│  → Atomic transaction fires:                             │
│     1. Create Student record                             │
│     2. Create Guardian/Emergency Contact                 │
│     3. Create Semester 1 enrollment record               │
│     4. Load initial fee from feeStructures               │
│     5. Generate Registration Number: ECU/YYYY/PROG/NNN   │
│     6. Mark applicant stage → "Enrolled"                 │
│     7. Log in audit trail                                │
└──────────────────────────────────────────────────────────┘
```

**Admission Types**:
- **National** — SSCSE certificate with 7 subjects passed (degree programs)
- **Direct** — Minimum 4 subjects (diploma/certificate programs)

**Admission Letter**: PDF button on admitted applicants (before enrollment).

---

### 5.5 Students Module

**Route**: `/admin/students`

Central hub for all enrolled student management.

#### 5.5.1 All Students List

```
Students Table:
Columns: Reg No. · Name · Program · Year · Semester · Status · Balance · Actions
Filters: Faculty · Program · Year of Study · Status · Academic Standing
Search: by name, reg number, phone

Row Actions:
- View Profile
- Edit Details
- View Financials
- View Academic Record
- Change Status (Active / Suspended / Deferred / Discontinued)
```

#### 5.5.2 Student Profile Page (Tabbed)

```
STUDENT PROFILE — TABS:
┌─────────────────────────────────────────────────────────┐
│  [Overview] [Academic] [Finance] [Course History] [Docs] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  OVERVIEW TAB:                                          │
│  - Photo · Name · Reg Number · Program                  │
│  - Year of Study · Current Semester · Status            │
│  - Academic Standing: Good Standing / Warning /         │
│    Probation / Dismissed                                │
│  - Guardian / Emergency Contact                         │
│  - Quick stats: CGPA · Credits Earned · Balance         │
│                                                         │
│  ACADEMIC TAB:                                          │
│  - Semester-by-semester GPA table                       │
│  - CGPA trend line chart                                │
│  - Course registration history per semester             │
│  - Retakes and supplementary exams flagged              │
│                                                         │
│  FINANCE TAB:                                           │
│  - Current balance (amount owed in SSP)                 │
│  - Payment history table (date · amount · receipt)      │
│  - Fee rollover history per semester                    │
│  - [Record Payment] button                              │
│                                                         │
│  COURSE HISTORY TAB:                                    │
│  - All courses taken across all semesters               │
│  - Grade per course                                     │
│  - Status: Completed / Retake / Dropped / W             │
│  - Credit hours summary                                 │
│                                                         │
│  DOCS TAB:                                              │
│  - SSCSE certificate upload                             │
│  - Birth certificate                                    │
│  - Passport / National ID                               │
│  - Admission letter (download)                          │
└─────────────────────────────────────────────────────────┘
```

#### 5.5.3 Course Registrations

**Route**: `/admin/students/course-registrations`

```
Course Registration Management:
┌──────────────────────────────────────────────────────────┐
│  CURRENT SEMESTER REGISTRATIONS                          │
│  Filter: Program · Year · Status                         │
│                                                          │
│  Table: Student · Course · Credits · Status · IsRetake   │
│                                                          │
│  Bulk Actions:                                           │
│  - Approve pending registrations                        │
│  - Export registration list (CSV)                       │
│                                                          │
│  Per-Student Actions:                                   │
│  - Register for Course (admin manual registration)      │
│  - Drop Course (with W-grade if past deadline)          │
│  - Flag as Retake                                       │
└──────────────────────────────────────────────────────────┘
```

#### 5.5.4 Academic Standing

**Route**: `/admin/students/academic-standing`

```
Academic Standing Flow:
┌──────────────────────────────────────────────────────────┐
│  END-OF-SEMESTER STANDING UPDATE                         │
│                                                          │
│  After all marks are "Approved" by HODs:                 │
│  → Admin clicks "Calculate Academic Standing"            │
│  → System queries all assessments for current semester   │
│  → Computes Semester GPA + CGPA for each student        │
│                                                          │
│  Auto-classification rules:                              │
│  CGPA >= 2.0     → Good Standing  (no action)           │
│  CGPA 1.5–1.99   → Warning        (email alert sent)    │
│  CGPA 1.0–1.49   → Probation      (max 4 courses next)  │
│  CGPA < 1.0      → Dismissed      (status Discontinued) │
│                                                          │
│  STANDING TABLE:                                         │
│  Columns: Student · CGPA · Semester GPA · Standing      │
│           · Semesters on Probation · Action              │
│                                                          │
│  Admin can manually override standing with reason note   │
└──────────────────────────────────────────────────────────┘
```

#### 5.5.5 Graduation Clearance

**Route**: `/admin/students/graduation`

```
Graduation Clearance Flow:
┌──────────────────────────────────────────────────────────┐
│  ELIGIBLE STUDENTS (Final Year, Semester 2 Complete)     │
│                                                          │
│  CLEARANCE CHECKLIST per student:                        │
│  ✅ / ❌  All required courses completed                 │
│  ✅ / ❌  Total credit hours met for the program         │
│  ✅ / ❌  CGPA >= 2.0                                   │
│  ✅ / ❌  Finance: Balance = 0 or officially cleared     │
│  ✅ / ❌  Library: No outstanding books                  │
│  ✅ / ❌  No active disciplinary actions                 │
│                                                          │
│  ACTIONS (when all checks pass):                         │
│  - Set status → "Graduated"                             │
│  - Assign degree classification:                         │
│      3.60–4.00  →  First Class Honours                  │
│      3.00–3.59  →  Second Class Upper                   │
│      2.50–2.99  →  Second Class Lower                   │
│      2.00–2.49  →  Pass                                 │
│  - Generate Official Transcript PDF                      │
│  - Prepare Degree Certificate                           │
└──────────────────────────────────────────────────────────┘
```

---

### 5.6 Staff Management

**Route**: `/admin/staff`

#### 5.6.1 All Staff

```
Staff Table:
Columns: Name · Email · Role · Department · Staff No. · Status · Actions
Filters: Role · Department · Status

Staff Roles (assignable):
- Super Admin · Admin · Registrar
- Dean · HOD · Lecturer
- Finance Officer · Librarian
```

#### 5.6.2 Course Allocations

**Route**: `/admin/staff/course-allocations`

```
Course Allocation Flow:
┌──────────────────────────────────────────────────────────┐
│  CURRENT SEMESTER ALLOCATIONS                            │
│  Filter: Department · Program · Semester                 │
│                                                          │
│  ALLOCATION TABLE:                                       │
│  Course · Lecturer · Department · Semester · Year        │
│                                                          │
│  ADD ALLOCATION:                                         │
│  - Select Course (from current semester's program list)  │
│  - Select Lecturer (from staff in owning department)     │
│                                                          │
│  CONSTRAINT RULES:                                       │
│  - HOD can only allocate within their department        │
│  - Super Admin can allocate across all departments       │
│  - One course = one lecturer per semester               │
│  - A lecturer can hold multiple courses                  │
│                                                          │
│  EFFECT AFTER ALLOCATION:                               │
│  → Course appears on Lecturer's Staff Portal dashboard   │
│  → Lecturer can now take attendance and enter marks      │
│  → Timetable slots reference the allocated lecturer      │
└──────────────────────────────────────────────────────────┘
```

---

### 5.7 Marks & Assessments

**Route**: `/admin/marks`

This module is the **academic integrity layer**.

```
MARKS LIFECYCLE DIAGRAM:
─────────────────────────────────────────────────────────────

  LECTURER (Staff Portal)               ADMIN PANEL VIEW
  ──────────────────────────          ─────────────────────────
  1. Set up assessment config          Admin sees all configs
     (weightings, max marks)           Can view in read-only

  2. Enter marks per student           Admin can view drafts
     Status: "Draft"

  3. Click "Submit to HOD"            HOD Review Queue shows
     Status: "Submitted"              this submission highlighted

  4. HOD reviews:                     Admin (Super Admin)
     ├── Approve → "Approved"         can also approve any
     └── Return → "Returned"          Approved = LOCKED for all
         (return includes reason)

  5. Lecturer discovers error after approval:
     └── Lecturer requests Unlock
     └── HOD issues Edit Grant        Admin audit log records
         (single student, once only)  all changes with reason

─────────────────────────────────────────────────────────────
```

#### 5.7.1 HOD Review Queue

**Route**: `/admin/marks/review-queue`

```
HOD Review Queue:
┌──────────────────────────────────────────────────────────┐
│  PENDING SUBMISSIONS (status: "Submitted")               │
│  Filter: Department · Course · Semester                  │
│                                                          │
│  TABLE:                                                  │
│  Course · Lecturer · Submitted Date · Students · Action  │
│                                                          │
│  Per Row Actions:                                        │
│  [Review Marks] [Approve All] [Return to Lecturer]       │
│                                                          │
│  REVIEW MODAL:                                           │
│  Full gradebook for all students in the course:          │
│  Student · Coursework · Exam · Final Score · Grade       │
│  Flags edited marks with an "Edited" badge               │
│  Return requires a reason text field                     │
└──────────────────────────────────────────────────────────┘
```

#### 5.7.2 Supplementary Exams

**Route**: `/admin/marks/supplementary`

```
Supplementary Exam Management:
┌──────────────────────────────────────────────────────────┐
│  ELIGIBLE STUDENTS (Grade D or Incomplete)               │
│                                                          │
│  Table: Student · Course · Original Score · Grade        │
│         · Reason (Missed Exam / D Grade) · Status        │
│                                                          │
│  Actions:                                               │
│  - Approve supplementary exam (schedules it)            │
│  - Enter supplementary result                           │
│  - Apply grade cap at C (50%) if ECU policy requires    │
│  - Trigger CGPA recalculation after result entry        │
└──────────────────────────────────────────────────────────┘
```

---

### 5.8 Finance Module

**Route**: `/admin/finance`

Finance runs in parallel to every academic action.

#### 5.8.1 Fee Structures

**Route**: `/admin/finance/fee-structures`

```
Fee Structure Admin:
┌──────────────────────────────────────────────────────────┐
│  FILTER: Program · Semester                              │
│                                                          │
│  TABLE:                                                  │
│  Program · Semester · Tuition · Reg Fee · Library        │
│  · ICT Fee · Activity Fee · TOTAL                        │
│                                                          │
│  CREATE / EDIT FEE STRUCTURE:                            │
│  - Program (select)                                      │
│  - Semester Number (1 or 2)                              │
│  - Tuition Fee (SSP)                                     │
│  - Registration Fee                                      │
│  - Library Fee                                           │
│  - ICT Fee                                               │
│  - Student Activity Fee                                  │
│  - Other Fees (dynamic add row)                          │
│  - Total: auto-calculated                               │
│                                                          │
│  DOWNSTREAM:                                             │
│  → Used during enrollment to set initial student balance │
│  → Used during Advance Semester to add new semester fees │
└──────────────────────────────────────────────────────────┘
```

#### 5.8.2 Student Financials

**Route**: `/admin/finance/students`

```
Student Financials Table:
Columns: Student · Program · Semester · Balance · Last Payment · Status
Filter: Program · Semester · "Has Outstanding Balance"

Per Student:
- View full payment history
- Record a new payment (amount · date · method · reference)
- Generate receipt PDF
- Waive a fee (requires Super Admin + reason)
- Print financial statement
```

#### 5.8.3 Financial Reports

```
Reports available:
- Total fees collected this semester
- Outstanding balances by program
- Fee collection progress (target vs actual)
- Individual student statements
- Payment method breakdown (cash / bank transfer / mobile money)
```

---

### 5.9 Library Module

**Route**: `/admin/library`

```
Library Management:
┌──────────────────────────────────────────────────────────┐
│  BORROW RECORDS TABLE                                    │
│  Columns: Student · Book Title · Borrowed · Due Date     │
│           · Return Date · Status · Overdue               │
│                                                          │
│  Actions:                                               │
│  - Issue Book (create borrow record)                    │
│  - Return Book (mark returned)                          │
│  - Flag Overdue                                         │
│  - View student's outstanding books                     │
│     (feeds into graduation clearance check)             │
└──────────────────────────────────────────────────────────┘
```

---

### 5.10 Reports Module

**Route**: `/admin/reports`

```
REPORT TYPES:

1. OFFICIAL TRANSCRIPT (per student)
   - All semesters · All courses · Grade · Credits
   - Semester GPA · CGPA at each point
   - Retakes marked · Supplementaries marked
   - University stamp + signature block
   - PDF download

2. SEMESTER ACADEMIC REPORT
   - All students · GPA distribution
   - Pass/fail rates per course
   - Attendance summary

3. ENROLLMENT REPORT
   - Students enrolled by program / semester / year
   - Year-over-year trend chart

4. FINANCIAL REPORT
   - Collections summary
   - Outstanding debtors list

5. GRADUATION LIST
   - Graduating students with classification
   - Export for ceremony preparation (CSV/PDF)
```

---

### 5.11 Settings Module

**Route**: `/admin/settings`

```
SETTINGS SECTIONS:

School Configuration:
- University Name
- Current Semester (read-only, managed via Academic Calendar)
- Current Academic Year
- Grading Scale (editable table: Score range → Grade → Grade Points)
- Semester Start/End dates
- Admission requirements per level (degree/diploma/certificate)

Roles & Permissions:
- Role assignment to staff users
- Permission matrix (which role can access what module)

Audit Log:
- All system mutations logged:
  WHO · WHAT · WHEN · OLD VALUE → NEW VALUE
- Filterable by action type, date, user
- Non-editable, read-only view
```

---

## 6. Admin Action Cascade Map

What changes elsewhere in the system when Admin takes an action:

```
ADMIN ACTION                        → WHAT CHANGES ELSEWHERE
──────────────────────────────────────────────────────────────────────────

Create Faculty                      → Departments can now reference it

Create Department + assign HOD      → HOD gets HOD Review Queue on Staff Portal
                                      HOD can allocate lecturers to dept courses

Create Program                      → Students can be enrolled into it
                                      Courses can be added to it
                                      Fee structures can be set for it

Create Course                       → Appears in Course Allocation for that dept
                                      Available in student course registration
                                      Feeds GPA calculation (credit hours)

Create Fee Structure (Prog + Sem)   → Used during Enrollment to set balance
                                      Used during Advance Semester rollover

Advance Semester                    → ALL active students get new enrollment record
                                      Fee rollover applied to all active students
                                      Deferred students SKIPPED (no fee, no record)
                                      Course registration opens for new semester
                                      Timetable resets for new semester

Enroll Applicant                    → Student record created
                                      Balance set from fee structure
                                      Semester 1 enrollment created
                                      Applicant stage → "Enrolled"
                                      Registration number generated

Allocate Lecturer to Course         → Course appears on Lecturer's Staff Portal
                                      Lecturer can take attendance
                                      Lecturer can enter marks
                                      Timetable references allocated lecturer

HOD Approves Marks                  → Marks locked (cannot be bulk-edited)
                                      GPA calculation becomes possible
                                      Transcript can be generated for that course

Calculate Academic Standing         → Student statuses may change
                                      Probation students get course limit (max 4)
                                      Dismissed students deactivated
                                      Notifications / alerts sent

Record Payment (Finance)            → Student balance reduced
                                      Payment recorded in history
                                      Receipt available for download

Issue Graduation Clearance          → Student status → "Graduated"
                                      Degree classification assigned
                                      Official transcript unlocked
                                      Alumni record created

Deactivate Staff Member             → Staff portal access removed
                                      Allocated courses flagged (need reassignment)

Update Grading Scale (Settings)     → Affects future grade calculations only
                                      Existing approved marks unchanged
```

---

## 7. Edge Case Handling in Admin Panel

| Edge Case | Admin Panel Action | System Effect |
|-----------|-------------------|---------------|
| Student skips a semester (dead semester) | Admin sets student to `Deferred` before Advance Semester | `advanceToNextTerm` skips deferred students — no fee, no enrollment record |
| Student retakes a failed course | Admin or student registers course with `isRetake: true` | New assessment created; best/latest grade replaces old in CGPA |
| Student misses final exam | Lecturer leaves `examMarks` blank; system assigns grade `"I"` (Incomplete) | Student applies for supplementary exam; if no action by deadline → converts to F |
| Supplementary exam taken | Admin enters result in Supplementary module | Grade capped at C (50%) per policy; CGPA recalculated |
| Lecturer submits wrong marks after approval | Lecturer requests unlock via HOD | HOD issues Edit Grant for that 1 student only; change logged in audit trail |
| Student drops a course mid-semester | Admin records drop with date; if after deadline → `"W"` grade applied | Credit hours adjusted; transcript shows W (no GPA impact) |
| Student on academic probation | System flags at end-of-semester standing check | Max 4 courses next semester; must clear within 2 semesters |
| CGPA drops below 1.0 | System recommends dismissal; admin confirms | Student status → `"Discontinued"` |
| Graduation checklist fails (balance owed) | Finance must clear balance first | Admin cannot issue graduation clearance until all checks pass |

---

## 8. Dark / Light Mode Implementation

### Package Installation

```bash
pnpm add next-themes --filter staff-portal
```

### Theme Provider

`apps/staff-portal/components/providers/theme-provider.tsx`:

```tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### Root Layout Wrap

`apps/staff-portal/app/layout.tsx`:

```tsx
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  </body>
</html>
```

### Mode Toggle Component

`apps/staff-portal/components/ui/mode-toggle.tsx`:

```tsx
"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

Place `<ModeToggle />` in the admin sidebar header or top navbar area.

---

## 9. UI Component Patterns (No Gradients — shadcn Only)

### Data Tables (all list views)
- Use shadcn `<Table>` with TanStack Table (DataTable pattern)
- Column sorting, filtering, pagination built in
- Row actions via `<DropdownMenu>` in last column
- Bulk selection via checkboxes

### Forms (all create/edit)
- shadcn `<Form>` + `react-hook-form` + `zod` validation
- `<Sheet>` (right-side drawer) for quick-create forms
- `<Dialog>` for confirmations and compact forms
- `<Combobox>` for referenced entities (programs, staff, courses)

### Status Badges
```tsx
// Semantic-only — maroon is reserved for primary interactive elements
Active      → variant="outline" text-green-600  border-green-200
Suspended   → variant="outline" text-red-600    border-red-200
Deferred    → variant="outline" text-yellow-600 border-yellow-200
Graduated   → variant="outline" text-blue-600   border-blue-200
Probation   → variant="outline" text-orange-600 border-orange-200
```

### Charts (shadcn Charts / Recharts)
- Bar chart: enrollment by program
- Line chart: CGPA trend per student
- Donut: fee collection vs outstanding
- Funnel: applicant pipeline stages

### Navigation Patterns
- Left sidebar (`<Sidebar>` component, collapsible icon mode)
- Breadcrumbs on every page: `Admin > Module > Sub-page`
- Command palette `⌘K` for global search (students, courses, staff)
- `<Tabs>` for detail pages (student profile, staff profile)

---

## 10. Build Priority Order

| Priority | Module | Why |
|----------|--------|-----|
| **P0** | Dark/Light theme + Maroon CSS tokens | Aesthetic baseline for all work |
| **P0** | Academic Structure (Faculties → Departments → Programs → Courses) | Data foundation everything depends on |
| **P0** | Fee Structures | Required before any enrollment |
| **P0** | Admissions + Enrollment wizard | First live operational flow |
| **P1** | Students list + profile page | Core daily operational need |
| **P1** | Staff management + Course Allocation | Enables lecturer workflows |
| **P1** | Academic Calendar + Advance Semester | Drives the semester cycle engine |
| **P2** | Marks + HOD Review Queue | Academic integrity flow |
| **P2** | Finance: record payments, statements | Financial operations |
| **P2** | Timetable management | Teaching period support |
| **P3** | Academic Standing + Probation logic | End-of-semester automation |
| **P3** | Graduation Clearance workflow | Final academic lifecycle step |
| **P3** | Reports + Transcripts (PDF) | Output documents |
| **P3** | Supplementary Exam management | Edge case handling |
| **P4** | Audit Log, Settings, Library | Operational polish |

---

*Blueprint compiled from: ecu-ssd.org website, ECU_ACADEMIC_FLOW.md, and shadcn/ui documentation.*
*Last updated: April 2026*

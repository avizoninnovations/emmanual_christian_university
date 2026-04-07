

# 🎓 ECU Academic Flow — End-to-End System Blueprint

> How our university management system will work — from an applicant knocking on ECU's door to a graduate walking out with a degree.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ECU ACADEMIC LIFECYCLE                                    │
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌───────────┐             │
│  │ADMISSION │──▶│ENROLLMENT│──▶│  SEMESTER   │──▶│PROGRESSION│──▶ 🎓       │
│  │  PHASE   │   │  PHASE   │   │   CYCLE     │   │  PHASE    │  GRADUATE  │
│  └──────────┘   └──────────┘   └────────────┘   └───────────┘             │
│                                  ▲         │                                │
│                                  │  REPEAT  │                                │
│                                  │ EACH SEM │                                │
│                                  └─────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: ADMISSION 📋

This is where a prospective student enters the system.

### Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  APPLICANT   │     │  INTERVIEW   │     │   ADMITTED    │     │  ENROLLED    │
│  APPLIES     │────▶│  / REVIEW    │────▶│  (Accepted)   │────▶│  (Student    │
│  (Stage: New)│     │  (Stage:     │     │              │     │   Created)   │
│              │     │  Interview)  │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                          ┌─────┘
                                          ▼
                                    ┌──────────────┐
                                    │  REJECTED     │
                                    │  (Not         │
                                    │   Accepted)   │
                                    └──────────────┘
```

### What Happens at Each Stage

| Stage | Who Acts | What Happens in the System |
|-------|----------|---------------------------|
| **New** | Registrar / Admissions Office | Applicant record created with: name, contact, target program, prior education, gender, DOB. System stamps current `semester` and `year`. |
| **Interview** | Admissions Committee | Applicant is reviewed. Notes are added. Documents verified. For degree programs: check 7 SSCSE subjects passed. For diploma: check 4 subjects. |
| **Admitted** | Admissions Committee | Applicant accepted into the target program. Admission letter can be generated. |
| **Rejected** | Admissions Committee | Applicant not accepted. Reason noted. |
| **Enrolled** | Registrar | Triggers the **Enrollment Transaction** (see Phase 2) → Applicant becomes a **Student**. |

### What Exists in Our Code Today ✅

- `applicants` table with full pipeline stages → **READY**
- `createApplicant` mutation with program targeting → **READY**
- `bulkUpdateApplicantStage` for batch operations → **READY**
- Paginated search with filters → **READY**
- Stage analytics (counts per stage) → **READY**

### What Needs Work 🔧

- [ ] Add `admissionType` field: `"National"` or `"Direct"` (ECU has both)
- [ ] Add document checklist/verification tracking
- [ ] Add admission letter PDF generation
- [ ] Validate subject count requirements (7 for degree, 4 for diploma)

---

## Phase 2: ENROLLMENT 📝

When an admitted applicant is enrolled, a **transactional operation** fires that creates the student and links everything together.

### Enrollment Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ENROLLMENT TRANSACTION                         │
│                                                                  │
│  1. Get Applicant Record                                        │
│          │                                                       │
│          ▼                                                       │
│  2. Create/Link Emergency Contact (Guardian/Sponsor)            │
│          │                                                       │
│          ▼                                                       │
│  3. Create Student Record                                       │
│     ├─ firstName, lastName, fullName                            │
│     ├─ programId (from applicant's targetProgramId)             │
│     ├─ status: "Active"                                         │
│     ├─ intakeSemester: current semester                         │
│     ├─ intakeYear: current year                                 │
│     ├─ currentYearOfStudy: 1                                    │
│     └─ balance: initial fee from feeStructure                   │
│          │                                                       │
│          ▼                                                       │
│  4. Create Semester Enrollment Record                           │
│     └─ studentSemesterEnrollments {studentId, programId,        │
│        semester, year, status: "Active"}                        │
│          │                                                       │
│          ▼                                                       │
│  5. Update Applicant → stage: "Enrolled"                        │
│          │                                                       │
│          ▼                                                       │
│  6. Log Action in Audit Trail                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Important Outcome

After enrollment, the student has:
- ✅ A `students` record with `programId` and `currentYearOfStudy = 1`
- ✅ A `studentSemesterEnrollments` record for their first semester
- ✅ A fee `balance` loaded from the fee structure for their program + semester
- ✅ An emergency contact linked

### What Exists Today ✅

- `enrollment.ts` → Atomic enrollment transaction → **READY**
- Fee auto-calculation from `feeStructures` → **READY** (needs program-based lookup)
- Emergency contact creation with optional user account → **READY**

### What Needs Work 🔧

- [ ] Generate `registrationNumber` during enrollment (e.g., `ECU/2026/BBA/001`)
- [ ] Generate `studentNumber` during enrollment
- [ ] Auto-create course registrations for Semester 1 courses of the program (or prompt for manual registration)

---

## Phase 3: THE SEMESTER CYCLE 🔄

This is the **heart of the university system**. Every semester, this cycle repeats for every active student.

### Semester Cycle Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ONE SEMESTER CYCLE                                │
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│   │   COURSE      │    │   TEACHING    │    │  ASSESSMENT   │             │
│   │ REGISTRATION  │───▶│   PERIOD      │───▶│   PERIOD      │            │
│   │  (Weeks 1-2)  │    │  (Weeks 3-14) │    │ (Weeks 15-18) │            │
│   └──────────────┘    └──────────────┘    └──────────────┘              │
│          │                    │                    │                      │
│          │                    │                    │                      │
│          ▼                    ▼                    ▼                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│   │ Student picks │    │ - Attendance  │    │ - Coursework  │             │
│   │ courses for   │    │ - Timetable   │    │   marks entry │             │
│   │ the semester  │    │ - Library     │    │ - Exam marks  │             │
│   │              │    │ - Assignments │    │ - Final score │             │
│   │              │    │              │    │ - Grade calc  │             │
│   └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                   │                      │
│                                                   ▼                      │
│                                           ┌──────────────┐              │
│                                           │   SEMESTER    │              │
│                                           │   RESULTS    │              │
│                                           │  (GPA Calc)  │              │
│                                           └──────────────┘              │
│                                                   │                      │
│                                                   ▼                      │
│                                           ┌──────────────┐              │
│                                           │  FEE ROLL-   │              │
│                                           │  OVER &      │              │
│                                           │ NEXT SEMESTER│              │
│                                           └──────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Step 3A: Course Registration

At the start of each semester, students register for courses.

```
Student (Year 1, Semester 1, BBA Program)
     │
     ├──▶ Register for: BBA 101 - Intro to Business (3 credits)
     ├──▶ Register for: BBA 102 - Principles of Accounting (3 credits)
     ├──▶ Register for: GEN 101 - Communication Skills (2 credits)
     ├──▶ Register for: GEN 102 - Computer Studies (2 credits)
     ├──▶ Register for: THE 101 - Christian Ethics (2 credits)
     │
     └──▶ Total: 5 courses, 12 credit units
```

**System Table**: `studentCourseRegistrations`

| Field | Value |
|-------|-------|
| studentId | → Student ID |
| courseId | → Course ID |
| programId | → Program ID |
| semester | 1 |
| year | 2026 |
| status | "Registered" |
| isRetake | false |

**What Exists ✅**: Schema and table ready  
**What Needs Work 🔧**:
- [ ] Build course registration UI (student picks courses for their program/year)
- [ ] Add credit hour total validation (min/max per semester)
- [ ] Add prerequisite checking
- [ ] Add registration deadline enforcement

---

### Step 3B: Course Allocation (Admin/HOD Side)

Before teaching begins, the **Head of Department (HOD)** or Academic Admin assigns **lecturers to courses** belonging to their department.

```
HOD of Business Department
     │
     ├──▶ Assign Dr. James  → BBA 101 (Intro to Business)
     ├──▶ Assign Mr. Peter  → BBA 102 (Principles of Accounting)
     ├──▶ Assign Mrs. Grace → GEN 101 (Communication Skills)
     └──▶ ...
```

**System Table**: `courseAllocations`

| Field | Value |
|-------|-------|
| lecturerId | → User ID |
| courseId | → Course ID |
| academicYear | 2026 |
| semester | 1 |

#### HOD Management Rules
- **Department Ownership**: Courses are linked to specific Departments.
- **HOD Authority**: Only the HOD assigned to a department (or a Super Admin) can allocate lecturers to courses within that department.
- **Lecturer View**: Once allocated, the course appears on the lecturer's dashboard for marks entry and attendance.

**What Exists ✅**: Full CRUD, lecturer dashboard, auto-sync with timetable, HOD-based allocation logic.

---

### Step 3C: Teaching Period (14 Weeks)

During the teaching period, the following modules are active:

#### Timetable
Lecturers have scheduled slots per course, per day.

```
Monday:    8:00-10:00  BBA 101 (Room A3)  — Dr. James
           10:00-12:00 GEN 101 (Hall B)   — Mrs. Grace
Tuesday:   8:00-10:00  BBA 102 (Room A3)  — Mr. Peter
           ...
```

**System Table**: `timeSlots` → **READY ✅**

#### Attendance
Lecturers take attendance per course, per session.

```
BBA 101 — Monday 5th Sept 2026
├─ John Ladu     → Present
├─ Mary Kiden    → Present
├─ Paul Taban    → Absent
└─ Grace Sunday  → Late
```

**System Table**: `attendance` → **READY ✅**  
Indexed by: `courseId + date`, `studentId + date`, `courseId + semester + year`

#### Library
Students can borrow books. Tracked per semester.

**System Table**: `borrowRecords` → **READY ✅**

---

### Step 3D: Assessment Period

This is where the grading happens. ECU uses a **weighted assessment model**.

#### Assessment Configuration (per Course, per Semester)

The lecturer sets up their grading columns:

```
BBA 101 — Intro to Business (Semester 1, 2026)
┌───────────────────┬──────────┬────────┐
│ Assessment Column │ Max Marks│ Weight │
├───────────────────┼──────────┼────────┤
│ Assignment 1      │    20    │   10%  │
│ CAT 1             │    30    │   10%  │
│ CAT 2             │    30    │   10%  │
│ Final Exam        │   100    │   70%  │
└───────────────────┴──────────┴────────┘
Total Weight: 100%
```

**System Table**: `assessmentConfigs` → **READY ✅**

#### Marks Entry

The lecturer enters marks per student, per assessment column:

```
Student: John Ladu — BBA 101
├─ Assignment 1:  16 / 20  → (16/20 × 10) = 8.0%
├─ CAT 1:         22 / 30  → (22/30 × 10) = 7.3%
├─ CAT 2:         25 / 30  → (25/30 × 10) = 8.3%
└─ Final Exam:    72 / 100 → (72/100 × 70) = 50.4%

Coursework Total: 8.0 + 7.3 + 8.3 = 23.6%
Exam Total: 50.4%
═══════════════════════════════
FINAL SCORE: 74.0%
```

**System Table**: `assessments`

| Field | Value |
|-------|-------|
| studentId | John's ID |
| courseId | BBA 101 ID |
| semester | 1 |
| year | 2026 |
| courseworkMarks | 23.6 |
| examMarks | 50.4 |
| finalScore | 74.0 |
| grade | "B+" |
| gradePoints | 3.5 |
| **status** | **"Draft" / "Submitted" / "Approved"** |

---

### Step 3E: Marks Submission & HOD Review Workflow 🛡️

To ensure academic integrity, ECU follows a strict submission and review workflow.

#### 1. The Marks Lifecycle
Marks move through four distinct states controlled by the Lecturer and HOD:

| State | Who Can Edit? | Action to Advance |
|-------|---------------|-------------------|
| **Draft** 📝 | Lecturer | Lecturer clicks "Submit to HOD" |
| **Submitted** 📤 | HOD Only | HOD clicks "Approve" or "Return" |
| **Returned** ↩️ | Lecturer | Lecturer re-edits and re-submits |
| **Approved** ✅ | HOD Only (Locked) | Marks are finalized for transcripts |

#### 2. Single Student "Edit Grants" 🔑
If a lecturer discovers an error in a *Submitted* or *Approved* student mark:
- They request an "Unlock" for that **specific student** from the HOD.
- HOD issues a **Granular Edit Grant**.
- Lecturer is allowed to edit **only that one student**, only once. 
- Bulk editing remains locked to prevent accidental changes to other students.

#### 3. Edit Flagging & Audit Trail 🚩
- Every edit made after initial submission is **flagged**.
- Both the Lecturer and HOD see an "Edited" badge in the gradebook.
- The system keeps a ledger (`assessmentEditLogs`) showing: **Original Mark → New Mark → Who Edited → Reason**.

**What Exists ✅**: Schema has core marks fields.  
**What Needs Work 🔧**:
- [ ] Implement `status` field logic (Draft/Submitted/Approved/Returned).
- [ ] Build HOD "Review Dashboard" to see all submitted course marks.
- [ ] Build "Edit Grant" mechanism (single student unlock).
- [ ] Build "Edit Flagging" UI and audit ledger.
- [ ] Auto-calculate `grade` and `gradePoints` from `finalScore` using the South Sudan scale.
- [ ] Auto-calculate `finalScore` from weighted assessment columns.

---

### Step 3E: Semester Results & GPA Calculation

After all courses are graded, the system calculates the student's **Semester GPA**.

#### Example: John Ladu — Semester 1, Year 1

```
┌──────────────────────────────┬─────────┬──────────┬───────┬──────────┬─────────────┐
│ Course                       │ Credits │ Score(%) │ Grade │ Grade Pt │ Weighted    │
├──────────────────────────────┼─────────┼──────────┼───────┼──────────┼─────────────┤
│ BBA 101 - Intro to Business  │    3    │   74.0   │  B+   │   3.5    │ 3 × 3.5=10.5│
│ BBA 102 - Accounting         │    3    │   82.0   │  A    │   4.0    │ 3 × 4.0=12.0│
│ GEN 101 - Communication      │    2    │   65.0   │  B    │   3.0    │ 2 × 3.0= 6.0│
│ GEN 102 - Computer Studies   │    2    │   58.0   │  C+   │   2.5    │ 2 × 2.5= 5.0│
│ THE 101 - Christian Ethics    │    2    │   70.0   │  B+   │   3.5    │ 2 × 3.5= 7.0│
├──────────────────────────────┼─────────┼──────────┼───────┼──────────┼─────────────┤
│ TOTALS                       │   12    │          │       │          │    40.5     │
└──────────────────────────────┴─────────┴──────────┴───────┴──────────┴─────────────┘

SEMESTER GPA = 40.5 / 12 = 3.375
```

#### Grading Scale Applied

| Score | Grade | Points |
|-------|-------|--------|
| 80-100 | A | 4.0 |
| 70-79 | B+ | 3.5 |
| 60-69 | B | 3.0 |
| 55-59 | C+ | 2.5 |
| 50-54 | C | 2.0 |
| 40-49 | D | 1.0 |
| 0-39 | F | 0.0 |

**What Needs Work 🔧**:
- [ ] Build GPA calculation engine (query all assessments for student + semester, fetch course credits, compute)
- [ ] Build semester transcript report/PDF
- [ ] Store semester GPA on student record or in a snapshot table

---

## Phase 4: SEMESTER TRANSITION ➡️

When the university advances to the next semester, several things happen:

### Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              ADVANCE TO NEXT SEMESTER                            │
│                                                                  │
│  1. Admin triggers "Advance Semester"                           │
│          │                                                       │
│          ▼                                                       │
│  2. Current period → status: "Completed"                        │
│          │                                                       │
│          ▼                                                       │
│  3. New period created → status: "Active"                       │
│     (Semester 1→2, or Semester 2→1 of next year)                │
│          │                                                       │
│          ▼                                                       │
│  4. Fee Roll-Over                                               │
│     ├─ Previous semester balance carries forward                │
│     └─ New semester fees added to student balances              │  
│          │                                                       │
│          ▼                                                       │
│  5. School Config updated                                       │
│     ├─ currentSemester = new semester                           │
│     ├─ currentYear = new year                                   │
│     └─ currentPeriodId = new period ID                          │
│          │                                                       │
│          ▼                                                       │
│  6. Students need to register for new semester courses          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Semester Flow Over a 4-Year Degree

```
YEAR 1                    YEAR 2                    YEAR 3                    YEAR 4
┌────────┬────────┐      ┌────────┬────────┐      ┌────────┬────────┐      ┌────────┬────────┐
│ Sem 1  │ Sem 2  │      │ Sem 1  │ Sem 2  │      │ Sem 1  │ Sem 2  │      │ Sem 1  │ Sem 2  │
│Aug-Dec │Jan-May │      │Aug-Dec │Jan-May │      │Aug-Dec │Jan-May │      │Aug-Dec │Jan-May │
│        │        │      │        │        │      │        │        │      │        │        │
│ GPA: ? │ GPA: ? │      │ GPA: ? │ GPA: ? │      │ GPA: ? │ GPA: ? │      │ GPA: ? │ GPA: ? │
│        │        │      │        │        │      │        │        │      │        │        │
│ CGPA ──┼─ CGPA ─┼──────┼─ CGPA ─┼─ CGPA ─┼──────┼─ CGPA ─┼─ CGPA ─┼──────┼─ CGPA ─┼─ FINAL │
│  calc  │  calc  │      │  calc  │  calc  │      │  calc  │  calc  │      │  calc  │  CGPA  │
└────────┴────────┘      └────────┴────────┘      └────────┴────────┘      └────────┴────────┘
                                                                                        │
                                                                                        ▼
                                                                                   🎓 GRADUATE
                                                                              (Degree Classification)
```

### What Exists ✅

- `academicPeriods.ts` → `advanceToNextTerm` mutation → **EXISTS but needs renaming** (term → semester)
- Fee roll-over logic → **EXISTS but needs adaptation** (uses `classes`/`level`, needs `programs`)
- `revertTermTransition` → **EXISTS** (uses old secondary school logic)

### What Needs Work 🔧

- [ ] Rename all "term" references to "semester" in `academicPeriods.ts`
- [ ] Fix fee roll-over to use `programs` instead of `classes`/`level`
- [ ] Add Year of Study auto-increment (when student completes Year 1 Sem 2 → bump to Year 2)
- [ ] Create new semester enrollment records for active students
- [ ] Mark previous semester course registrations as "Completed"

---

## Phase 5: YEAR PROGRESSION 📈

When a student completes both semesters of an academic year:

### Progression Rules

```
┌─────────────────────────────────────────────────────────────┐
│                 YEAR PROGRESSION                             │
│                                                              │
│  Calculate CGPA after Year X Semester 2                     │
│          │                                                   │
│          ├── CGPA ≥ 2.0 ──▶ PROGRESS to Year (X+1)         │
│          │                   └─ currentYearOfStudy += 1     │
│          │                                                   │
│          ├── CGPA < 2.0 ──▶ ACADEMIC PROBATION              │
│          │                   └─ Student gets warning         │
│          │                   └─ May repeat courses           │
│          │                                                   │
│          └── CGPA < 1.0 ──▶ DISCONTINUED                    │
│                              └─ status → "Discontinued"     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What Needs Work 🔧

- [ ] Build CGPA calculation across all semesters
- [ ] Build academic standing logic (Good Standing / Probation / Discontinued)
- [ ] Build year progression logic
- [ ] Add retake course tracking (`isRetake: true` on `studentCourseRegistrations`)

---

## Phase 6: GRADUATION 🎓

When a student reaches their final year and completes all requirements:

### Graduation Checklist Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  GRADUATION CLEARANCE                        │
│                                                              │
│  ✅ All required courses completed                          │
│  ✅ All credit hours met for the program                    │
│  ✅ CGPA ≥ 2.0 (minimum pass)                              │
│  ✅ Financial clearance (balance = 0 or cleared)            │
│  ✅ Library clearance (no outstanding books)                │
│  ✅ No active disciplinary actions                          │
│          │                                                   │
│          ▼                                                   │
│  Student status → "Graduated"                               │
│  Degree Classification assigned based on CGPA:              │
│                                                              │
│     3.60 – 4.00  →  First Class Honours                    │
│     3.00 – 3.59  →  Second Class Upper Division            │
│     2.50 – 2.99  →  Second Class Lower Division            │
│     2.00 – 2.49  →  Pass                                   │
│                                                              │
│  Official Transcript generated                              │
│  Degree Certificate prepared                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**What Exists ✅**: Student status includes `"Graduated"` and `"Alumni"`  
**What Needs Work 🔧**:
- [ ] Build degree audit (courses completed vs required)
- [ ] Build graduation clearance workflow
- [ ] Build official transcript PDF
- [ ] Assign degree classification on graduation

---

## Phase 7: FINANCE THROUGHOUT 💰

Finance runs parallel to the academic flow at every stage.

### Fee Lifecycle

```
ENROLLMENT                    EACH SEMESTER                    GRADUATION
     │                              │                              │
     ▼                              ▼                              ▼
┌──────────┐               ┌──────────────┐               ┌──────────────┐
│Initial   │               │ Semester fee  │               │ Clearance    │
│fee loaded│               │ applied to    │               │ balance must │
│to balance│               │ balance       │               │ be 0         │
│          │               │              │               │              │
│          │               │ Payments      │               │              │
│          │               │ reduce balance│               │              │
└──────────┘               └──────────────┘               └──────────────┘
```

### Fee Structure (per Program, per Semester)

```
Bachelor of Business Administration (BBA)
┌─────────────────────────────────────────┐
│         SEMESTER 1 FEES                  │
│                                          │
│  Tuition Fee:          15,000 SSP       │
│  Registration Fee:      1,000 SSP       │
│  Library Fee:             500 SSP       │
│  ICT Fee:                 500 SSP       │
│  Student Activity:        300 SSP       │
│  ─────────────────────────────────      │
│  TOTAL:                17,300 SSP       │
└─────────────────────────────────────────┘
```

**System Table**: `feeStructures` → keyed by `programId` + `semesterNumber`  
**What Exists ✅**: Fee structure system with other fees integration  
**What Needs Work 🔧**:
- [ ] Migrate from `level`/`termNumber` to `programId`/`semesterNumber` (schema already updated, backend logic needs updating)
- [ ] Update fee roll-over in `advanceToNextTerm` to use program-based fees

---

## Complete Data Flow Diagram

### How Tables Connect

```
                          ┌─────────────┐
                          │  faculties   │
                          │  (3 total)   │
                          └──────┬──────┘
                                 │ has many
                                 ▼
                          ┌─────────────┐
                          │ departments  │───── deanId, hodId ────▶ users (lecturers)
                          └──────┬──────┘
                                 │ has many
                                 ▼
                    ┌─────────────────────────┐
                    │       programs           │
                    │  (16 programs)           │
                    │  BBA, BAT, BED-MIT, etc.│
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              │              │                   │
              ▼              ▼                   ▼
     ┌─────────────┐  ┌──────────┐     ┌──────────────────┐
     │   courses    │  │ students │     │  feeStructures   │
     │ (per program)│  │(enrolled)│     │(per program+sem) │
     └──────┬──────┘  └────┬─────┘     └──────────────────┘
            │              │
            │    ┌─────────┼───────────────────────┐
            │    │         │                        │
            ▼    ▼         ▼                        ▼
   ┌────────────────┐  ┌──────────────────┐  ┌───────────┐
   │courseAllocations│  │studentCourse     │  │ payments  │
   │(lecturer→course)│ │Registrations     │  │(reduce    │
   │                │  │(student→course)  │  │ balance)  │
   └────────────────┘  └───────┬──────────┘  └───────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │ assessments   │
                       │(marks, grades)│
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  GPA / CGPA   │
                       │ Calculation   │
                       └──────┬───────┘
                              │
                              ▼
---

## Phase 8: STUDENT PORTAL (Self-Service) 📱

In a university system, students are active users. They must have a dedicated portal to manage their academic life.

### Student Portal Features

| Feature | Description |
|---------|-------------|
| **My Profile** | View personal details, registration number, and program info. |
| **Course Registration** | Self-enroll for courses each semester (Weeks 1-2). |
| **My Timetable** | View personal class schedule based on registered courses. |
| **Financial Statement** | View fee balance, payment history, and download receipts. |
| **My Results** | View semester results, GPA, and unofficial transcripts. |
| **Clearance Status** | Track graduation clearance from various departments. |

### The "Self-Service" Flow
1. **Login**: Student logs in with their Registration Number/Email.
2. **Action**: They see a "Register for Courses" alert at the start of the semester.
3. **Selection**: They pick courses from their assigned curriculum.
4. **Validation**: System checks credit limits and prerequisites.
5. **Confirmation**: Final selection is sent to the HOD/Dean for approval (optional).

**What Needs Work 🔧**:
- [ ] Build the Student Portal frontend layout.
- [ ] Implement self-service course registration logic.
- [ ] Build the "My Results" dashboard with GPA visualization.
- [ ] Build the "Financial Statement" view for students.

## Legacy Code Issues ⚠️ (What Still Uses School Terminology)

Looking at our actual codebase, these are the specific **legacy issues** that must be fixed:

| File | Issue | Fix Needed |
|------|-------|-----------|
| `academicPeriods.ts` | Uses `term` everywhere (line 44, 68, 86, 114, etc.) | Rename to `semester` |
| `academicPeriods.ts` | References `HeadTeacher`, `Secretary` roles (line 124) | Change to `Registrar`, `ViceChancellor`, `Dean` |
| `academicPeriods.ts` | Uses `currentTerm` on config (line 44, 178) | Change to `currentSemester` |
| `academicPeriods.ts` | Fee rollover uses `classes`/`level` (lines 258-270) | Use `programs`/`programId` |
| `assessments.ts` | Uses `classId`, `subject`, `by_class_period` (lines 15, 53, 95) | Use `courseId`, `by_course_period` |
| `assessments.ts` | Grade scale is secondary-style (A=80, B=70, C=60, D=50, E=40) | Use university scale with B+, C+ |
| `feeStructures.ts` | Uses `level`, `termNumber`, `dayTuition`, `boardingTuition` | Use `programId`, `semesterNumber`, `tuitionFee` |
| `feeStructures.ts` | References `by_level_term` index (line 66) | Use `by_program_semester` |
| Schema (line 8) | `semester` field — already correct ✅ | — |
| Schema (lines 131-140) | `programs` table — already correct ✅ | — |
| Schema (lines 144-158) | `courses` table — already correct ✅ | — |
| Schema (lines 225-235) | `studentSemesterEnrollments` — already correct ✅ | — |
| Schema (lines 239-253) | `assessments` — already correct ✅ | — |

---

## Summary: The Academic Calendar in One View

```
                          ACADEMIC YEAR 2026/2027
    ┌──────────────────────────────────┬──────────────────────────────────┐
    │         SEMESTER 1                │         SEMESTER 2                │
    │     August 2026 – Dec 2026       │     January 2027 – May 2027     │
    ├──────────────────────────────────┼──────────────────────────────────┤
    │                                   │                                   │
    │  📋 Course Registration           │  📋 Course Registration           │
    │  📅 Timetable Published           │  📅 Timetable Published           │
    │  💰 Semester Fees Applied         │  💰 Semester Fees Applied         │
    │  📚 14 Weeks Teaching             │  📚 14 Weeks Teaching             │
    │  ✅ Attendance Tracking           │  ✅ Attendance Tracking           │
    │  📝 Coursework (30-40%)          │  📝 Coursework (30-40%)          │
    │  📖 1 Week Reading               │  📖 1 Week Reading               │
    │  📄 2-3 Weeks Exams (60-70%)     │  📄 2-3 Weeks Exams (60-70%)     │
    │  📊 Results & GPA                │  📊 Results & GPA                │
    │                                   │  📈 CGPA + Year Progression     │
    │                                   │                                   │
    └──────────────────────────────────┴──────────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  LONG VACATION   │
                          │  June – July     │
                          └─────────────────┘
```

---

---

## ⚠️ EDGE CASES: Retakes, Dead Semesters, Missed Exams & More

These are the scenarios that break a simple "happy path" flow. Here's an honest audit of how our system handles each one today.

---

### 1. 🔁 RETAKES (Repeating a Failed Course)

**What is it?**
A student who scores below 40% (Grade F) in a course must re-register and retake that course in a future semester to earn the credits.

#### How It Should Work

```
SEMESTER 1, 2026 — Student takes BBA 102
     │
     ▼
Final Score: 35% → Grade: F → Grade Points: 0.0
     │
     ▼  Course status → "Completed" (but FAILED)
     │
NEXT SEMESTER — Student re-registers for BBA 102
     │
     ▼
studentCourseRegistrations {
   studentId: "John",
   courseId: "BBA 102",
   semester: 2,          ← new semester
   year: 2026,
   status: "Registered",
   isRetake: true         ← ✅ THIS FLAG EXISTS IN OUR SCHEMA
}
     │
     ▼
New assessment created for Semester 2 → New grade replaces old in CGPA
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| `isRetake` field on `studentCourseRegistrations` | ✅ **EXISTS** (schema line 219) | Boolean flag — ready to use |
| Logic to flag a registration as retake | ❌ **MISSING** | No mutation ever sets `isRetake: true` |
| Logic to identify which courses need retaking | ❌ **MISSING** | No query checks "which courses did the student fail?" |
| CGPA recalculation after retake | ❌ **MISSING** | No logic to replace old grade with new grade |
| UI for retake registration | ❌ **MISSING** | No interface exists |

#### What Needs Building

```
┌─────────────────────────────────────────────────────────────────┐
│                     RETAKE FLOW                                  │
│                                                                  │
│  1. System queries assessments where grade = "F" or "D"         │
│     for the student across all semesters                        │
│          │                                                       │
│          ▼                                                       │
│  2. Shows list of "Courses Available for Retake"                │
│          │                                                       │
│          ▼                                                       │
│  3. Student/Admin registers for course with isRetake: true      │
│          │                                                       │
│          ▼                                                       │
│  4. New assessment record created in the NEW semester           │
│          │                                                       │
│          ▼                                                       │
│  5. CGPA recalculation:                                         │
│     OPTION A: Best grade replaces old grade (common)            │
│     OPTION B: Latest grade replaces old grade                   │
│     OPTION C: Both count (harsh — some universities do this)    │
│                                                                  │
│  ⚠️ DECISION NEEDED: Which retake policy does ECU follow?       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Retake Impact on Transcript

```
TRANSCRIPT — John Ladu

Semester 1, 2026:
  BBA 102 - Accounting    │ 3 credits │ 35% │ F │ 0.0 │ ← ORIGINAL (struck through or marked)

Semester 2, 2026:
  BBA 102 - Accounting    │ 3 credits │ 55% │ C+ │ 2.5 │ ← RETAKE (this grade counts for CGPA)
```

---

### 2. 💀 DEAD SEMESTERS (Student Skips a Semester)

**What is it?**
A student does NOT enroll for a semester. They don't attend, don't register for courses, and don't pay fees. The semester is "dead" — they sit it out and return later.

Common reasons: financial hardship, illness, personal reasons, travel.

#### How It Should Work

```
NORMAL TIMELINE:
  Year 1 Sem 1 ──▶ Year 1 Sem 2 ──▶ Year 2 Sem 1 ──▶ ...

WITH DEAD SEMESTER:
  Year 1 Sem 1 ──▶ Year 1 Sem 2 ──▶ [DEAD: Year 2 Sem 1] ──▶ Year 2 Sem 1 (actual)
                                         │
                                         └─ No enrollment record
                                         └─ No course registrations
                                         └─ No fees applied
                                         └─ No attendance
                                         └─ Student status → ???
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| `studentSemesterEnrollments` with `status: "Withdrawn"` | ✅ **EXISTS** (schema line 230) | Could represent dead semester |
| Student status `"Suspended"` | ✅ **EXISTS** (schema line 176) | But this is for disciplinary actions |
| A "Deferred" or "On Leave" student status | ❌ **MISSING** | No status for voluntary leave |
| A way to skip fee application during semester advance | ❌ **MISSING** | `advanceToNextTerm` applies fees to ALL active students indiscriminately |
| Track which semesters were dead | ❌ **MISSING** | No explicit dead semester record |

#### What Needs Building

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEAD SEMESTER HANDLING                          │
│                                                                  │
│  OPTION 1: Student status approach                              │
│  ─────────────────────────────────                              │
│  Add new student status: "Deferred" or "On Leave"               │
│  - Student manually set to "Deferred" before semester advances  │
│  - advanceToNextTerm SKIPS deferred students (no fees applied)  │
│  - No enrollment record created for that semester               │
│  - Student returns → status set back to "Active"                │
│  - currentYearOfStudy does NOT increment during dead semester   │
│                                                                  │
│  OPTION 2: Enrollment record approach (cleaner)                 │
│  ─────────────────────────────────────────────                  │
│  Create enrollment record with status: "Deferred"               │
│  studentSemesterEnrollments {                                   │
│    studentId, programId, semester, year,                        │
│    status: "Deferred",  ← ADD THIS TO THE UNION                │
│    dateEnrolled: null                                           │
│  }                                                              │
│  - Fee system checks enrollment status before applying fees     │
│  - Transcript shows "DEFERRED" for that semester                │
│  - Student's academic clock pauses                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Impact on Graduation Timeline

```
Student enrolled in 4-year BBA program:

WITHOUT dead semester:   4 years (8 semesters) → Graduate 2030
WITH 1 dead semester:    4.5 years (8 semesters + 1 dead) → Graduate mid-2030
WITH 2 dead semesters:   5 years (8 semesters + 2 dead) → Graduate 2031

System must track ACTUAL semesters attended, not just calendar years.
The field currentYearOfStudy only increments when BOTH semesters of a year are completed.
```

---

### 3. ❌ MISSED EXAMS (Student Absent During Examination)

**What is it?**
A student is registered for a course, attended classes, did coursework — but MISSED the final exam.

Common reasons: illness, emergency, disciplinary suspension during exam period.

#### How It Should Work

```
Student: John Ladu — BBA 101
├─ Assignment 1:  16/20   ✅ Completed
├─ CAT 1:         22/30   ✅ Completed
├─ CAT 2:         25/30   ✅ Completed
└─ Final Exam:    ???     ❌ MISSED — No score recorded

What happens?
├─ OPTION A: Record "Incomplete" (I) grade → Student takes exam next semester
├─ OPTION B: Record 0 for exam → Student gets coursework marks only → Likely fails
├─ OPTION C: Record "Missed Exam" → Special supplementary exam scheduled
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| `assessments.examMarks` as `v.optional(v.number())` | ✅ **EXISTS** | Can be `undefined` (missing) — represents no exam taken |
| `assessments.finalScore` as `v.optional(v.number())` | ✅ **EXISTS** | Can remain unset if exam not taken |
| `assessments.grade` as `v.optional(v.string())` | ✅ **EXISTS** | Could store "I" (Incomplete) |
| Attendance tracking with "MISSED" status for slots | ✅ **EXISTS** | `attendance.ts` already has `TAKEN / NOT TAKEN / MISSED` status logic |
| Special "Incomplete" grade handling | ❌ **MISSING** | No logic treats missing exam differently from a zero |
| Supplementary exam scheduling | ❌ **MISSING** | No mechanism to offer a make-up exam |
| Deadline to convert Incomplete → grade | ❌ **MISSING** | No automatic fallback |

#### What Needs Building

```
┌─────────────────────────────────────────────────────────────────┐
│                   MISSED EXAM FLOW                               │
│                                                                  │
│  1. Exam period ends. Lecturer submits marks.                   │
│     For John: examMarks = undefined (not entered)               │
│          │                                                       │
│          ▼                                                       │
│  2. System detects: student has coursework but no exam          │
│     → Auto-assign grade: "I" (Incomplete)                       │
│          │                                                       │
│          ▼                                                       │
│  3. Student has options:                                        │
│     ├─ A) Apply for SUPPLEMENTARY EXAM (with valid reason)      │
│     │   └─ If approved → Special exam scheduled                 │
│     │   └─ Exam taken → grade updated, CGPA recalculated       │
│     │                                                            │
│     ├─ B) Take the course as a RETAKE next semester             │
│     │   └─ Full retake: new coursework + new exam               │
│     │                                                            │
│     └─ C) No action within deadline                             │
│         └─ "I" converts to "F" automatically                   │
│         └─ Student must retake the course                       │
│                                                                  │
│  ⚠️ DECISION NEEDED: What is ECU's policy on missed exams?     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. 📝 SUPPLEMENTARY EXAMS (Second Chance Exam)

**What is it?**
An extra exam offered to students who either:
- Failed the course with a grade of D (40-49%) — close to passing
- Missed the exam with a valid reason
- Need to clear an Incomplete grade

#### How It Should Work

```
NORMAL EXAM:        Semester 1 exam period (Weeks 15-18)
SUPPLEMENTARY:      After results release, before next semester starts
                    Usually 2-4 weeks after normal results

Assessment record:
├─ Original:       examMarks: 35 → finalScore: 45% → grade: D
│
└─ After Supp:     examMarks: 52 → finalScore: 55% → grade: C+
                   NOTE: Some universities CAP supplementary at C (50%)
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| Assessment record with `examMarks` | ✅ **EXISTS** | Can be overwritten with supplementary score |
| Tracking whether an exam was supplementary | ❌ **MISSING** | No `isSupplementary` flag |
| Supplementary exam cap (max grade C) | ❌ **MISSING** | No business rule |
| Supplementary exam eligibility logic | ❌ **MISSING** | No query to find eligible students |

#### What Needs Building

Add to `assessments` schema:
```javascript
// New fields needed
isSupplementary: v.optional(v.boolean()),    // Was this a supplementary exam?
originalExamMarks: v.optional(v.number()),   // Preserve original score
examType: v.optional(v.union(
  v.literal("Normal"),
  v.literal("Supplementary"),
  v.literal("Special")                      // For missed exams with valid reason
)),
```

---

### 5. 🔄 COURSE DROP / WITHDRAWAL (Mid-Semester)

**What is it?**
A student drops a course after the registration period but before the end of the semester.

#### How It Should Work

```
Week 1-2:  Registration period → Add/drop freely
Week 3-4:  Late drop period → Drop with "W" (Withdrawn) on transcript, no GPA impact
Week 5+:   No drop allowed → Must complete or take F
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| `studentCourseRegistrations.status: "Dropped"` | ✅ **EXISTS** (schema line 218) | The status value exists |
| Logic/mutation to drop a course | ❌ **MISSING** | No `dropCourse` mutation exists |
| Drop deadline enforcement | ❌ **MISSING** | No date-based validation |
| "W" grade on transcript | ❌ **MISSING** | No withdrawn grade handling |
| Credit hour adjustment after drop | ❌ **MISSING** | No recalculation of semester load |

---

### 6. 📊 ACADEMIC PROBATION & DISMISSAL

**What is it?**
Students whose CGPA falls below the minimum standard are placed on probation or dismissed.

#### How It Should Work

```
┌──────────────────────────────────────────────────────────┐
│                ACADEMIC STANDING RULES                     │
│                                                           │
│  CGPA ≥ 2.0     →  Good Standing     ✅                 │
│  CGPA 1.5-1.99  →  Academic Warning   ⚠️ (1st offense)  │
│  CGPA 1.0-1.49  →  Academic Probation 🟡 (restricted)   │
│  CGPA < 1.0     →  Academic Dismissal 🔴 (discontinued) │
│                                                           │
│  Probation rules:                                        │
│  - Student can only register for max 4 courses           │
│  - Must improve CGPA above 2.0 within 2 semesters       │
│  - If not improved → Dismissed                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### What Our Code Has Today

| Element | Status | Details |
|---------|--------|---------|
| Student `status: "Discontinued"` | ✅ **EXISTS** | Can be used for academic dismissal |
| Student `cgpa` field | ✅ **EXISTS** | Ready to store calculated CGPA |
| CGPA calculation logic | ❌ **MISSING** | No function computes this |
| Academic standing classification | ❌ **MISSING** | No logic checks CGPA thresholds |
| Probation tracking / restrictions | ❌ **MISSING** | No probation state or course limit enforcement |
| Automatic status change based on CGPA | ❌ **MISSING** | No trigger after results |

---

### 7. 📋 FULL EDGE CASE MAP — What Exists vs What's Missing

```
┌────────────────────────────────┬───────────┬──────────────────────────────────────┐
│ SCENARIO                       │ STATUS    │ DETAILS                              │
├────────────────────────────────┼───────────┼──────────────────────────────────────┤
│ Retake flag on registrations   │ ✅ SCHEMA │ isRetake field exists, no logic      │
│ Retake identification query    │ ❌ NONE   │ Need "which courses did I fail?"     │
│ Retake CGPA recalculation      │ ❌ NONE   │ Need grade replacement logic         │
│ Dead semester (Deferred)       │ ❌ NONE   │ No deferred status, no fee skip      │
│ Missed exam → Incomplete       │ ❌ NONE   │ examMarks is optional (good), no "I" │
│ Supplementary exam             │ ❌ NONE   │ No supp tracking or grade cap        │
│ Course drop mid-semester       │ ✅ SCHEMA │ "Dropped" status exists, no logic    │
│ Course drop deadline           │ ❌ NONE   │ No date-based enforcement            │
│ "W" grade on transcript        │ ❌ NONE   │ No withdrawn grade handling          │
│ Academic probation             │ ❌ NONE   │ No standing classification           │
│ Academic dismissal             │ ✅ SCHEMA │ "Discontinued" status exists         │
│ CGPA calculation               │ ❌ NONE   │ Field exists, no computation         │
│ GPA per semester               │ ❌ NONE   │ No calculation function              │
│ Attendance → exam eligibility  │ ❌ NONE   │ No "75% attendance required" rule    │
│ Attendance MISSED detection    │ ✅ CODE   │ attendance.ts has MISSED status      │
│ Student suspension (discipline)│ ✅ CODE   │ discipline.ts handles this           │
│ Fee skip for deferred students │ ❌ NONE   │ advanceToNextTerm bills everyone     │
│ Graduation clearance           │ ❌ NONE   │ No checklist/workflow                │
│ Transcript with retakes shown  │ ❌ NONE   │ No transcript generation             │
└────────────────────────────────┴───────────┴──────────────────────────────────────┘
```

---

### 8. 🏗️ RECOMMENDED SCHEMA ADDITIONS

To properly handle all edge cases, we need these additions:

```javascript
// ===== ADDITIONS TO students TABLE =====
students: defineTable({
  ...existingFields,
  // ADD:
  academicStanding: v.optional(v.union(
    v.literal("Good Standing"),
    v.literal("Warning"),
    v.literal("Probation"),
    v.literal("Dismissed")
  )),
  status: v.union(
    v.literal("Active"),
    v.literal("Suspended"),      // Disciplinary
    v.literal("Deferred"),       // ← NEW: Dead semester / voluntary leave
    v.literal("Discontinued"),   // Academic dismissal
    v.literal("Alumni"),
    v.literal("Graduated"),
  ),
})

// ===== ADDITIONS TO studentSemesterEnrollments TABLE =====
studentSemesterEnrollments: defineTable({
  ...existingFields,
  status: v.union(
    v.literal("Active"),
    v.literal("Withdrawn"),
    v.literal("Completed"),
    v.literal("Deferred"),       // ← NEW: Dead semester
  ),
})

// ===== ADDITIONS TO assessments TABLE =====
assessments: defineTable({
  ...existingFields,
  // ADD:
  examType: v.optional(v.union(
    v.literal("Normal"),
    v.literal("Supplementary"),
    v.literal("Special"),        // Missed exam with approved reason
  )),
  isSupplementary: v.optional(v.boolean()),
  originalExamMarks: v.optional(v.number()),  // Store original before supplementary
  status: v.optional(v.union(
    v.literal("Graded"),
    v.literal("Incomplete"),     // ← Missing exam
    v.literal("Pending"),        // ← Marks not yet entered
  )),
})

// ===== NEW TABLE: academicStandingHistory =====
academicStandingHistory: defineTable({
  studentId: v.id("students"),
  semester: v.number(),
  year: v.number(),
  semesterGPA: v.number(),
  cumulativeGPA: v.number(),
  standing: v.union(
    v.literal("Good Standing"),
    v.literal("Warning"),
    v.literal("Probation"),
    v.literal("Dismissed")
  ),
  totalCreditsAttempted: v.number(),
  totalCreditsEarned: v.number(),
  note: v.optional(v.string()),
})
  .index("by_student", ["studentId"])
  .index("by_student_period", ["studentId", "semester", "year"])
```

---

### 9. 🎯 PRIORITY ORDER FOR IMPLEMENTATION

| Priority | Feature | Reason |
|----------|---------|--------|
| **P0** | GPA/CGPA calculation | Everything else depends on this |
| **P0** | Grade auto-assignment from finalScore | Core grading logic |
| **P1** | Retake identification + registration | Most common edge case |
| **P1** | Dead semester / Deferred status | Students WILL skip semesters |
| **P1** | Fee skip for deferred students | Financial correctness |
| **P2** | Supplementary exam tracking | Happens every exam period |
| **P2** | Missed exam → Incomplete grade | Happens regularly |
| **P2** | Course drop with deadline | Needed for proper registration |
| **P3** | Academic standing/probation | Important but follows CGPA |
| **P3** | Attendance-based exam eligibility | Policy enforcement |
| **P3** | Transcript with retake/supplementary marks | Reporting output |

---

> **HONEST ASSESSMENT: Our schema has the right bones (retake flag, dropped status, optional exam marks) but has ZERO backend logic for any of these edge cases. The `assessments.ts` file still uses secondary school logic (`classId`, `subject`, simple average). Before building features, we need to first fix the core grading engine, then layer these edge cases on top. The decisions on retake policy, supplementary caps, and dead semester handling need ECU management input.**

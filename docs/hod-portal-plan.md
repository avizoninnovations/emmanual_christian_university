# ECU Head of Department workspace implementation plan

Status: core workflow implemented in the working tree; migration and operational acceptance remain.
Source review: 24 October 2026, repository revision `0f96b3c`.

Implementation update: department leadership, allocations, scoped gradebooks, mark edit permissions, mark review/publication, student result filtering, audit history, and staff entry points are now implemented. The data model adds compatible workflow fields and audit tables; existing numeric zeros are retained, while new missing marks use entered flags. Approved values are preserved as snapshots during correction. Existing 50/60 pass threshold ambiguity remains unresolved and no threshold policy was silently changed.

## 1. Outcome and scope

Use the existing staff portal and staff identity. Add department management capabilities to an appointed HOD while retaining the shared staff pages and any lecturer responsibilities. The operational hierarchy is:

**System administrator appoints HOD → HOD allocates courses → lecturer enters and submits marks → HOD approves → student sees approved results.**

The HOD is the final routine academic approver for their department. No additional dean or senate approval stage is proposed. Existing supplementary and broadsheet routes must respect the same approval boundary.

The first delivery covers department appointments, current/upcoming semester allocations, department oversight, submission and approval, student publication, individual time-limited editing permissions, and the audit trail. Attendance calculations remain excluded, as previously requested. Broader HR, finance, procurement, and inventory workflows are outside this delivery.

## 2. Existing foundations and gaps found in the source

| Area | Current implementation | Work required |
| --- | --- | --- |
| Staff identity | `staffProfiles.roles` supports multiple roles; `departmentId` is an optional string | Retain one account, validate department relationships, and separate staff membership from an active leadership appointment |
| Department setup | `departments.hodId`; admin department create/update in `academic.ts` | Atomically appoint, replace, or remove an HOD; synchronize navigation roles and retain appointment history |
| HOD pages | `/hod/allocations`, `/hod/review-queue`, `/hod/broadsheet`, `/hod/supplementaries` | Reuse and refactor these views; add department overview and edit permissions |
| Allocation | `allocateLecturerToCourse` supports a period argument | Enforce the HOD's department, lecturer eligibility, period validity, duplicate protection, and reassignment rules; add upcoming/past period selection to the UI |
| Gradebook access | `getCourseGradebook`, save, and submit primarily check authentication | Verify the actor's allocation or department authority on every request; validate the course roster |
| Class membership | Gradebook falls back to all active program students if registrations are absent | Use explicit course-period registrations, with registered/completed historical eligibility; no invented roster from program membership |
| Review and approval | Role checks exist, but department scope is optional; approval updates all assessments for a course-period | Scope on the server; approve an exact submitted version; prevent approval of draft/incomplete/stale work |
| Student visibility | `getMyAcademicResults` returns score fields for all statuses; only GPA arithmetic is restricted to approved rows | Exclude unapproved score data in backend responses and use one publication policy across every student result surface |
| Unlock | Boolean `isUnlocked`, existing `assessmentId`, no expiry | Replace with a student/course/period/lecturer grant that can authorize missing marks even before an assessment exists |
| Unlock actor | `grantSingleStudentUnlock` uses the whole `assertRole` return value as `unlockedBy` | Store the authenticated actor's user ID, using explicit types |
| Semester navigation | Class results links carry only `courseId`; entry defaults to the active period | Carry the chosen `periodId` through links, reads, saves, submissions, reviews, and grants |
| Missing marks | Entry code converts blanks to zero and uses zero to detect incompleteness | Preserve missing values separately from a legitimate zero score |
| Grading | Entry UI uses a 50 pass threshold; student journey uses 60; grading rules exist elsewhere | Agree on ECU's actual policy, then use one calculation source; do not infer policy from the reference portal or code comments |
| Alternate result writes | `recordSupplementaryMark` directly sets `approved` and accepts broad staff roles | Route all academic result changes through the authorized review/publication workflow |
| Existing teaching cover | A cover request/review flow exists | Apply department scope; approval to cover a lecture must not automatically grant marks editing |

Primary source files: `packages/backend/convex/{schema,academic,users,allocations,marks,student_portal,student_dashboard,student_services,broadsheet,teaching_cover}.ts`, `lib/utils.ts`, staff `modules/hod/ui/views`, `modules/marks`, and the shared staff sidebar.

## 3. Identity, appointments, and access

- System administrators use the existing staff and department management area to select an active staff member and appoint them to a department. Creating a new staff account remains part of the existing staff onboarding flow.
- Retain the existing `admin`, `hod`, `lecturer`, `senior_lecturer`, and `staff` role vocabulary. The HOD's account can hold both `hod` and `lecturer` roles.
- A role label alone does not authorize department operations. Resolve the current active appointment on the backend, then verify the target course belongs to that department.
- An HOD who teaches uses the same My Course Units and marks entry pages as another lecturer. Editing requires an explicit course-period allocation, including when the allocated lecturer is the HOD.
- One current HOD per department is the initial rule. If one person is appointed to more than one department, each appointment is explicit and the UI offers only those departments.
- Appointment replacement ends the previous appointment, installs the successor, updates the compatibility HOD field, and writes an audit event atomically. Remove HOD capabilities immediately on subsequent requests; preserve unrelated roles and teaching allocations.
- Inactive staff cannot allocate, review, enter marks, or exercise grants. Existing sessions do not override current backend permissions.
- Recommended conflict rule: an HOD cannot approve their own teaching submission or grant themselves exceptional editing rights. An administrator can explicitly nominate another active HOD as reviewer for that course-period, with a reason and audit entry. This is an exception, not an extra routine approval tier.

| Capability | System administrator | Appointed HOD | Allocated lecturer | Student |
| --- | --- | --- | --- | --- |
| Appoint/replace HOD | Yes | No | No | No |
| Assign lecturer to course-period | Audited override | Own department | No | No |
| View departmental academic records | Authorized administration | Own department | Assigned classes | Own approved results |
| Enter draft marks | Explicit teaching allocation only | Own teaching allocations | Own teaching allocations | No |
| Review/approve/return | Explicit audited exception | Own department; conflict rule applies | No | No |
| Grant/revoke exceptional edits | Audited override | Own department; conflict rule applies | Request only | No |

Authorization helpers should cover department management, class reads, ordinary mark writes, exceptional mark writes, and publication. Frontend visibility is a convenience; the server enforces all of these restrictions independently.

## 4. Routes and page organization

Keep shared staff navigation, profile, memos, personal services, timetable, and lecturer routes. Show a **DEPARTMENT MANAGEMENT** sidebar section with visible main links for authorized HODs, using the existing section spacing and icons.

| Route | Purpose and primary contents |
| --- | --- |
| `/hod` | Department Overview: period selector; unassigned units; teaching staff; pending submissions; missing marks; active/expiring permissions; links into the relevant work |
| `/hod/allocations` | Course Allocations: current/upcoming/past semesters, program/year filters, course, lecturer, student count, allocation status; assign/reassign/remove and see lecturer workload |
| `/hod/lecturers` | Department Lecturers: eligible teaching staff, current and upcoming allocations, submission progress, drill-down to classes |
| `/hod/review-queue` | Marks Review: submitted/returned/approved/history views, course, period, lecturer, students, missing components, submission time, review actions |
| `/hod/review-queue/[gradebookId]` | Class review: fixed submitted version, student marks, completeness checks, changes since last approval, approve selected eligible rows/all eligible rows, return with reason |
| `/hod/edit-permissions` | Edit Permissions: requests plus granted/expired/revoked/submitted grants; grant for a specific student and course-period, choose components and expiry, revoke, inspect history |
| `/hod/broadsheet` | Department Results: reuse existing route with department scope; approved results and publication status; clearly labeled staff-only review output where needed |
| `/hod/activity` | Academic activity history: appointments, allocations, submissions, approvals, returns, grants, and corrections scoped to the department |

Preserve `/hod/supplementaries`; align its authorization and approval behavior before allowing it to publish results. A new supplementary redesign is not a prerequisite for the core HOD delivery.

Use the current ECU theme in both modes, subtle tab underlines, small consistent radii, and full-width content. Put icon breadcrumbs inside the content with the agreed vertical spacing. Keep the navbar removed. Use compact filters and actionable tables instead of repeated page-introduction text. Show skeletons only for data that is loading, and distinct empty, denied, validation, error, and success states.

Use `/courses/[courseId]?periodId=...` consistently for lecturer class results. Redirect old links to a valid period selection; an explicit historical or upcoming period must never silently fall back to the current one.

## 5. End-to-end workflows

### A. Course allocation

1. HOD selects an academic period within their department; default to current and allow an existing upcoming period.
2. Show the department's course units and eligible active lecturers, including an HOD with teaching eligibility.
3. Save one primary lecturer assignment per course-period, with actor, time, and allocation version. Academic period is distinct from the course's curriculum semester/year.
4. The lecturer immediately sees the allocation under the correct upcoming/current/past section. Upcoming assignments are visible, while marks entry opens only in the configured entry window.
5. Reassignment requires a reason and retains history. The previous lecturer loses write access immediately; outstanding grants tied to that allocation become invalid. Preserve the original authorship of existing marks.
6. Once marks exist, removal cannot delete their context or history. Close/end the allocation explicitly; block changes during an approval operation. Historical allocations are read-only by default, with explicit audited administration for corrections.

### B. Marks submission and approval

Working row lifecycle: **draft → submitted → approved**, or **submitted → returned → draft → submitted**.

1. The allocated lecturer saves draft scores for registered students in the selected course and period. A blank is missing; numeric zero is a valid score.
2. Validate component ranges and configured grading rules on the backend. Reject invalid values with specific feedback rather than silently clamping or skipping locked rows.
3. Submission freezes a version of the changed rows, records who submitted it and when, and locks those rows for normal editing. It does not downgrade unrelated approved rows.
4. HOD opens the version submitted for review. Show missing work separately, including enrolled students with no assessment row at all.
5. Recommended initial policy: permit complete rows to be submitted and approved while incomplete students remain unpublished and clearly listed. Require an explicit policy-supported result code for exceptional incomplete outcomes. Do not manufacture a zero or failed grade from a blank.
6. Return selected rows, or the whole submitted set, with a required reason. Ordinary returned rows can be corrected within the entry window; after that window they require an exceptional grant.
7. Approval validates department authority, reviewer conflict, submission version, row completeness, and grading policy. Record reviewer and approval time and publish exactly those approved values.
8. Students see approved results immediately through reactive queries. Ordinary HOD approval is the publication action; no second Publish button is necessary.

### C. Missing marks and corrections with an expiry

1. Lecturer requests access for a specific student/course/period with the missing or incorrect component and a reason. HOD may also grant directly from the roster, including a student with no existing assessment record.
2. HOD chooses the authorized lecturer, allowed components (coursework, examination, or both), start time, expiry, and reason. The chosen lecturer must remain eligible for that class; a grant cannot silently transfer a teaching allocation.
3. Suggested duration presets: 1 hour, 24 hours, or a custom deadline. Maximum duration is a policy decision, not hardcoded as a university rule.
4. Only that student's allowed cells become editable. Show the deadline beside the row and the relevant permission in the lecturer's task list.
5. Every save checks server time, actor, active appointment/assignment, student membership, exact course/period, permitted components, grant status, and version. The interval is `startsAt <= serverNow < expiresAt`.
6. Allow repeated draft saves within the grant window. Submission consumes the grant and locks the correction for HOD review. A grant is not consumed by merely opening the page or making the first save.
7. Expiry or revocation blocks further saves/submission immediately, including from an already-open tab. Preserve saved draft work; HOD can issue a new grant referencing it. Do not auto-publish when time runs out.
8. The correction returns to HOD review. Record before/after values, grant ID, reason, lecturer, reviewer, and timestamps. Approving one correction does not reopen the rest of the class.

### D. Student publication

- The backend must return only the authenticated student's approved result snapshots. No draft coursework, examination score, final score, grade, or GPA contribution may leak through network payloads, exports, transcript queries, dashboards, or alternate endpoints.
- During a correction, the recommended default is to keep the last approved snapshot visible while the new draft remains staff-only. A never-approved result shows “Awaiting approval” without scores.
- If an already published result is invalid and must be hidden, provide an explicit audited withdrawal action. Withdrawal removes it from student results and recalculated totals until a replacement is approved.
- All student screens and exports use the same approved result projection. Supplementary, retake, import, and administrative result writers must pass through the same publication boundary.

## 6. Data model changes

Reuse `staffProfiles`, `departments`, `courses`, `academicPeriods`, `courseAllocations`, `studentCourseRegistrations`, `studentAssessments`, and `auditLogs`. Add only the records needed to represent appointment history, submissions, permissions, and publication safely.

| Record | Proposed fields and purpose | Main access patterns/indexes |
| --- | --- | --- |
| `departmentLeadershipAssignments` (new) | `departmentId`, `staffUserId`, active/ended status, `appointedBy`, `startsAt`, `endedAt`, `endedBy`, reason; authoritative active HOD appointment | department + status; staff user + status; validate one active head per department atomically |
| `departments` / `staffProfiles` | Maintain legacy `hodId` as a compatibility projection; migrate valid profile department strings to typed department IDs; add department index | department lookup and eligible staff listing; role grants synchronized with active appointments |
| `courseAllocations` (extend) | Assignment actor/time, version, state, closure/reassignment reason; retain unique course-period assignment semantics | course + period; lecturer + period; department + period |
| `courseGradebooks` (new) | Course, period, department, allocation/version, normal entry window, optional exception reviewer, current submission version, workflow state, review actor/times; one per course-period | course + period; department + period + workflow state |
| `studentAssessments` (extend) | Optional/missing component representation, working revision, gradebook link, submission version, editing actor/time, review metadata; maintain per-student/course/period uniqueness | existing student + course + period; gradebook + status; course + period |
| `assessmentRevisions` (new) | Immutable saved/submitted/approved changes with explicit before/after values or snapshots, component values, version, actor, reason, and optional grant ID | assessment + version; gradebook + submission version; department + time for restricted audit access |
| `publishedResults` (new) | One current approved projection per student/course/period: approved revision ID, component scores, final/grade/points, grading policy version, reviewer/time, published/withdrawn status | student + status + period; course + period + status; student + course + period |
| `markEditGrants` (new) | Student, course, period, department, lecturer, allocation/version, optional assessment ID, components, start/expiry, requested/granted/revoked actors/times, reason, pending/granted/submitted/revoked/expired/rejected status | lecturer + status; department + status; student + course + period; status + expiry |

Working assessment values and approved snapshots must remain distinct. Totals and grades are derived server-side from configured policy; the client does not supply trusted final grades. Store audit/revision history as separate rows, not growing arrays on a class or student document.

Add compound indexes with names matching fields. Paginate rosters, grants, queues, revisions, and history. Batch related reads and use maintained counters or aggregate components for dashboard totals, updating aggregates on every relevant write. Do not repeatedly scan whole registration/assessment tables for counts.

## 7. Backend and integration design

- Add focused modules for HOD appointments/access, gradebook submissions/review, edit grants, and published student results. Decompose the large existing marks module while retaining compatibility wrappers until callers migrate.
- Provide operations for appoint/end HOD; department context; list/assign/reassign allocations; roster and entry permissions; save draft; submit version; list/review/approve/return submission; request/grant/revoke edit permission; publish/withdraw result; paginated activity history.
- Keep authentication, role and scope checks, validation, writes, revision creation, and audit creation in the same mutation transaction where atomicity is required. Internal helpers do not replace authorization on the public entry point.
- Use optimistic revision checks so an old browser cannot overwrite a newer score or approve stale work. Duplicate submission/approval requests must be idempotent or produce a clear already-completed response.
- For large classes, process bounded batches under a durable review/publication operation. Freeze the version, stage records, and flip a completion marker only when the entire selected approval is ready. Student reads must never observe a partially published approval batch. Failed batches remain resumable and unpublished.
- Expiration is enforced by server time on each mutation, independently of any scheduler. Schedule expiry state updates for reactive UI badges; use a client countdown for display only. Delayed scheduled execution must never extend access.
- Department/HOD removal, inactive users, and reassignment must invalidate inappropriate grants even before a cleanup job runs. Avoid relying on old cached role claims.
- Keep audit events for appointment, reassignment, submission, return, approval, grant, revocation, expiration, correction, and withdrawal. Capture actor and targets explicitly. Show these through authenticated, department-scoped history views.
- Use in-app task indicators for assignments, reviews, returned work, and edit permissions. Email/SMS can follow later and must not be required for saving or publishing results.

## 8. Delivery order and acceptance gates

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| 1. Permission and visibility foundation | Department authorization helpers; allocation ownership; backend filtering of unapproved student scores; protect all result writers, including supplementary paths | Student cannot retrieve draft scores; lecturer cannot read/write another class; HOD cannot act outside their department |
| 2. HOD appointment and navigation | Admin appointment/replacement, capability composition, route guards, department overview/sidebar section | One staff login supports HOD plus lecturer; replacement removes old HOD powers without removing lecturer access |
| 3. Period-aware course allocations | Current/upcoming/history selection, lecturer eligibility/workload, assignment history, course-period links | Upcoming allocation appears for lecturer in the correct semester; reassignment immediately transfers authorized access |
| 4. Submission, review, and publication | Missing-vs-zero semantics, revisioned submissions, review tables, approve/return, published snapshots | Lecturer → HOD → student flow works; stale approvals fail; incomplete rows remain unpublished |
| 5. Individual edit permissions | Request/grant/revoke/expire, scoped row/component entry, correction resubmission | A missing assessment can be entered within the grant; expiry blocks writes; correction needs approval |
| 6. Migration and operational completion | Existing data migration, dashboard totals, audit history, supplementary/retake compatibility, realistic fixtures | Published history is preserved, legacy grants are retired, all callers use the shared permission/publication rules |

Deliver each phase as a reviewable commit and push it, following the user's standing preference. Phases 1–5 have implementation in the working tree. The initial delivery uses approved snapshots embedded on assessment records and department assignment history rather than separate revision/publication tables, keeping schema migration compatible with existing data. Remaining phase 6 work includes a dry-run data audit/backfill, richer dashboard counts/workload summaries, and production browser verification.

## 9. Migration and verification plan

1. Inventory role/HOD mappings, invalid department IDs, duplicate allocations/registrations/assessments, legacy unlocks, and unapproved result usage. Produce a dry-run discrepancy report; do not auto-select winners for ambiguous academic records.
2. Add schema fields/tables compatibly. Backfill active leadership appointments only where the department assignment and staff identity are valid. Resolve role/appointment disagreement explicitly.
3. Backfill gradebooks and versions per course-period in resumable batches. Create published snapshots only from records already approved. Preserve available historical dates/actors; label unavailable approval provenance as legacy instead of inventing it.
4. Do not convert legacy numeric zeros to missing marks without evidence. Preserve valid zeros and flag ambiguous imported records for review.
5. Retire boolean unlocks. Existing grants without a known expiry need fresh, explicit HOD grants; do not give them indefinite permission through migration.
6. Switch lecturer, HOD, student result, transcript, dashboard, export, supplementary, and retake callers to the new authorization and publication path. Remove compatibility paths after migration and verification.
7. Prepare isolated demo cases: two departments, an HOD who teaches, a second HOD for exception review, assigned/unassigned lecturers, upcoming allocations, real zero scores, missing components, approved marks, and grants that are pending/active/expired/revoked.
8. Verify direct backend access boundaries and complete browser workflows using those fixtures. Required scenarios include cross-department denial; wrong-period denial; inactive lecturer denial; tampered student ID; no assessment yet; expired grant from an already-open tab; component-only permission; reassignment after grant; concurrent edits; repeated approval; self-review exception; failed publication batch; and student isolation.
9. Verify that unapproved values are absent from student network responses and exports. Check that published GPA/CGPA and retake eligibility use the agreed policy and approved versions only.
10. Run backend, staff-portal, and student-portal typechecks for implementation changes. Add meaningful permission, state-transition, and expiry tests as part of the implementation task. This planning change itself does not require application execution or schema deployment.

## 10. Policy decisions to settle before their implementation phases

The following are recommendations, not claimed existing ECU rules:

- **HOD's own submissions:** use an explicitly nominated independent HOD reviewer; prevent self-approval and self-issued exceptional edit rights.
- **Incomplete classes:** approve complete students separately while incomplete students remain unpublished, with explicit missing/result-code handling.
- **Corrections:** keep the last approved version visible until a new version is approved; allow a separately audited withdrawal when necessary.
- **Grant duration and normal entry deadline:** use HOD-selected deadlines within an administrator-configured limit, displayed in Africa/Nairobi time and stored as UTC timestamps. Establish the actual permitted maximum and normal submission deadlines before enforcement.
- **Grading:** confirm the official pass threshold, component weights, rounding, grade-point scale, and supplementary/retake rules. Current 50/60 thresholds conflict; the plan does not choose one silently.

The core workflow and access foundation can be implemented while these policy choices are finalized.

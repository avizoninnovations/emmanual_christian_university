# Alpha teacher portal review and academic clone plan

Captured from the user’s logged-in Alpha teacher session on 2026-10-19. The locally saved evaluation screenshot is excluded from Git because it displays employee evaluation information.

- [Teacher evaluation screen](screenshots/01-alpha-teacher-evaluation.jpg)
- [Teacher week timetable](screenshots/02-alpha-week-timetable.jpg)

## Academic workflows seen in the teacher account

- **Staff dashboard:** pending tasks, undergraduate reports, memos, current semester progress and staff context.
- **Results:** Lecturer Courses, My Course Units, My Aegrotat Units and E-Learning Courses.
- **Timetable → Teaching Timetable:** weekly timetable with Week/List/Legacy views, active-period summary, class and slot counts, a course-name/code search, daily class cards, and a View Charts action. The captured active period showed no scheduled classes.
- **Timetable → Dataform Management:** exposed as an academic route; exact fields and workflow still need inspection.
- **My Alpha → My Teaching:** teacher-facing teaching workspace entry.
- **My Alpha → My Evaluation / Evaluate Supervisors:** evaluation-related routes appeared, but these may be HR rather than academic workflows and are out of this phase unless later confirmed as required for teaching.

Other visible modules include finance, HR/personnel, leave, complaints/defenses, meals, goods requests, inventory and vehicle booking. They are recorded for context and **deferred**; this plan does not include implementing them.

Academics Office, Faculty Central and Alpha Extras appeared in the teacher menu without accessible child routes. Inspect those later with the appropriate academic-officer role before adding their behaviors to scope.

## Current ECU academic data and backend

The existing schema already contains most of the teacher’s core records:

| Academic data | Existing Convex table(s) | Current usage |
| --- | --- | --- |
| Staff identity, role and department | `staffProfiles` | Staff authorization and profile context |
| Programs, departments and courses | `programs`, `departments`, `courses` | Course catalog and academic structure |
| Lecturer teaching load | `courseAllocations` | Lecturer courses, indexed by lecturer and period |
| Active academic periods | `academicPeriods` | Period context for teaching and results |
| Marks, gradebook status and review | `assessmentBlocks`, `studentAssessments`, `gradingScales` | Coursework/exam marks and draft/submitted/approved/returned lifecycle |
| Attendance | `attendanceRecords` | Class attendance by course, period and date |
| Teaching schedule | `timetables` | Lecturer schedule by period/day |
| Teaching cover | `teachingCoverRequests` | Lecturer cover request/review workflow |
| Student feedback about lecturers | `lecturerEvaluations` | Student evaluations; not staff performance reviews |

The ECU staff portal already has lecturer courses, course workspace/marks, attendance, timetable, teaching cover, and HOD course allocations, review queue, broadsheet and supplementary exams. The lecturer dashboard still has a courses/schedules placeholder.

### Phase 1 — Keep teacher sign-in stable and match the student login design

- Reuse the student portal’s ECU logo, background and two-step sign-in presentation, while keeping the staff email/password auth call and staff landing route.
- Do not sign out or otherwise change the Alpha staff browser session during this work.
- Investigate reported session loss separately from the login redesign. Check local Better Auth/Convex URLs, trusted origins and cookie behavior without exposing secrets. Reproduce with an active lecturer account before changing session rules.
- The previously reported local `ECONNREFUSED 127.0.0.1:3211` means the Convex dev service was unavailable. Treat connection failures as infrastructure errors, not as proof a staff session is invalid.
- Retain server-side inactive/banned enforcement and intentional Sign Out. Do not convert temporary profile-query/network failures into session revocation.

### Phase 2 — Academic lecturer dashboard and screens

- Replace the “courses and schedules” placeholder with the current lecturer’s active period, assigned courses, next classes, attendance status, gradebook submission/review states and outstanding academic actions.
- Use the existing course, allocation, timetable, attendance and marks tables. Add a bounded, indexed dashboard query that aggregates only the signed-in lecturer’s data for the active period.
- Match the Alpha screen divisions and interaction patterns after capturing its dashboard and each academic route. Keep accessible loading, empty and connection-error states.
- Compare Lecturer Courses, My Course Units, My Aegrotat Units, E-Learning Courses, attendance, marks and teaching cover. Confirm Dataform Management’s meaning and fields before deciding whether it needs a new table or is already represented by a form workflow.

### Phase 3 — Verify gaps before changing schema

- Compare Alpha lecturer course detail, marks entry/submission, timetable, attendance and any teaching/cover workflow against the ECU views.
- Prefer extending the existing tables and APIs. Add schema only for confirmed academic data that has no existing representation, such as required assessment metadata or a missing state/history record.
- For every new field/table, define indexed access by lecturer, course, period and status/date as appropriate; enforce permissions in Convex; audit marks/review transitions; and seed representative teacher/HOD data.

### Explicitly deferred

Staff finance, HR and personal records, leave, exit, discipline, complaints/defenses, meals, employee evaluations, vehicle bookings, procurement/RFG requests, inventory/department store and non-academic extras are outside the current implementation scope. They can be revisited after the academic workflows are complete.

---
description: The official Emmanuel Christian University (ECU) monorepo standards for DSA, Auth, role-based access, and professional Shadcn UI.
---

# Emmanuel Christian University — Code Style & Standards

This guide defines the **"ECU Way"** of building. It ensures high
performance (DSA), security (Auth + RBAC), and premium aesthetics (ECU
Maroon theme) across the monorepo for Emmanuel Christian University
(Goli, Yei River County, South Sudan).

---

## 1. Architectural Philosophy

Our monorepo is divided into three distinct layers:

- **Portals (`apps/`)** — Thin, consumer-facing shells (Next.js). They
  handle routing and UI composition but delegate heavy logic to
  packages.
- **Core Packages (`packages/`)**:
  - `backend` — The source of truth (Convex). Contains all schema,
    business logic, and the Better Auth component.
  - `ui` — The design system (shadcn/Tailwind). Contains atomic
    primitives only.
- **Domain Modules** — Located within `apps/<portal>/modules/`. Use
  domain-driven design to organize UI by feature
  (admissions, finance, marks, students, courses, hod).

### Why monorepo + 6 apps?
Each portal is a deployable target with a focused UX:
- `staff-portal` — Admin + Lecturer + HOD + Finance
- `student-portal` — Student self-service
- `finance` — Cashier portal (planned)
- `inventory` — Asset tracking (planned)
- `library` — Library catalog (planned)
- `lms` — LMS — courses, assignments

They share `packages/backend` (single Convex deployment) and
`packages/ui` (single design system).

---

## 2. Convex & DSA Best Practices (The Guardrails)

Performance and Security are not optional. Every function must follow
these "Agent-Proof" principles:

- **Zero-Trust Entry** — Every public query/mutation MUST start with
  an `assertAuthenticated` or `assertRole` check from
  `packages/backend/convex/lib/utils.ts`.
- **Indexed-Only Reads** — Never use `.filter()` without first
  prefixing it with `.withIndex()`. Every lookup must be O(1) or
  O(log N).
- **Mandatory Pagination** — For any table expected to grow beyond
  50 records (students, transactions, audit logs, ledgers,
  attendance), use `paginate()` + `cursor`. Forbidding `.collect()`
  on those datasets.
- **Atomic Integrity** — Group multiple `db` writes into a single
  `internalMutation` to ensure state consistency. Never perform two
  separate `db.insert/patch` calls from an action — wrap them.
- **Fail-Fast with `ConvexError`** — Usage of standard `Error` is
  discouraged. All rejections must use `ConvexError` to provide
  structured feedback to the UI.
- **O(1) Enrichment** — Never `await ctx.db.get(...)` inside a loop.
  Batch unique IDs with `Promise.all`, build a `Map<Id, Doc>`, and
  enrich in linear time.
- **Chunked Mutations** — Bulk operations (semester invoicing,
  promotion, rollover) must process in chunks of 100–250 items.

---

## 3. Identity, Better Auth & RBAC

Better Auth is our identity provider, living in
`packages/backend/convex/betterAuth`.

- **Identity Retrieval** — Use `createAuth(ctx)` in actions to
  perform administrative tasks (create users, ban, revoke sessions).
- **Staff Profiles** — The `user` table is for identity; the
  `staffProfiles` table (linked via `userId`) is for domain data
  (roles, department, title, staffId).
- **Role Handshake** — Server-side role checks must always use the
  `roles` array from the `staffProfiles` record.
- **Canonical Role Codes** — defined in `packages/backend/convex/roles.ts`:
  - System: `admin`
  - Leadership: `vice_chancellor`, `deputy_vc`, `dean`
  - Academic: `hod`, `registrar`, `admissions_officer`,
    `examinations_officer`, `senior_lecturer`, `lecturer`
  - Finance: `bursar`, `finance`, `cashier`
  - Support: `librarian`, `dean_of_students`, `chaplain`,
    `ict_officer`, `hr_officer`, `staff`

  New roles must be added to `ECU_DEFAULT_ROLES` AND
  `PROTECTED_ROLE_CODES` (if referenced by `assertRole`).

---

## 4. Professional UI & Theme Consistency

ECU interfaces must look and feel premium.

- **Atomic Composition** — Standard primitives come from
  `packages/ui`. Domain-specific UI is composed in
  `modules/*/ui`.
- **Theme Integrity** — Use OKLCH CSS variables for all styling.
  Never hardcode colours.
  - Brand: `var(--primary)` (ECU Maroon `#800000`)
  - Status: `var(--muted-foreground)`, `var(--secondary)`
- **Typography & Motion**:
  - SANS (UI body): Inter
  - SERIF (academic headings, marksheets): Source Serif 4
  - MONO (registration numbers, audit details, receipts): JetBrains
    Mono
- **Aesthetics** — Prioritize spacing (standardized 4/8/12/16/24/32
  rhythm), subtle shadows (`var(--shadow-sm)`), and micro-animations
  for interactions.

---

## 5. ECU Domain Vocabulary

Always use canonical ECU terms in code, UI labels, and commit
messages:

| Concept | Use |
| --- | --- |
| Top org unit | Faculty (Theology, Education, Business) |
| Within Faculty | Department |
| Degree track | Program (BBA, BAT, BEDU-MIT, …) |
| Unit of teaching | Course (e.g. `BBA 101`, 3 credit units) |
| Term | Semester (1 or 2) |
| Academic year | Academic Period (e.g. "Semester 1, 2026") |
| Student ledger | `studentLedger` — totalDue / totalPaid / balance |
| Payment channel | cash / m-Gurush / Equity / KCB / Stanbic / bank_deposit |
| Currency | SSP (default) / USD |
| Pass mark | 60% final score |
| Attendance rule | ≥ 75% present/late to be exam-eligible |
| Installment milestones | 40% (Registration) / 75% (Midterm) / 100% (Exam) |

---

## 6. Verification Checklist

Before committing any change, verify:

- [ ] `pnpm --filter @workspace/backend exec tsc --noEmit` → 0 new
      errors
- [ ] All new buttons use shadcn `<Button>` from `@workspace/ui`
- [ ] All new selects use shadcn `<Select>` from `@workspace/ui`
- [ ] All destructive confirms use `<AlertDialog>`
- [ ] All forms use `react-hook-form` + `zod` + shadcn `<Form>`
- [ ] No hardcoded hex colours anywhere
- [ ] Convex reads use `.withIndex(...)` (no unindexed `.filter()`)
- [ ] Bulk operations chunked at 100–250 items
- [ ] Mutating sensitive data calls `logAction()` at the end
- [ ] `page.tsx` files stay under 100 lines
- [ ] ECU vocabulary used in field labels, table headers, and audit
      log messages
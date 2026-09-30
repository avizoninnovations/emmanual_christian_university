---
name: clean-code
description: >-
  Enforces Clean Code principles, the 4-layer architecture, and strict
  TypeScript standards across the Emmanuel Christian University (ECU)
  monorepo. Use whenever writing, refactoring, or reviewing code to ensure
  small modular files (page.tsx < 100 lines, components < 300 lines),
  separation of presentation from business logic, zero `any` types,
  shadcn/ui primitives, dynamic ECU Maroon theming, and typed Convex API
  references.
---

# Clean Code Standards for Emmanuel Christian University

This skill defines the mandatory coding, architecture, design system, and
verification standards for the **ECU** monorepo (Emmanuel Christian
University — Goli, Yei River County, South Sudan). Every AI agent, tool,
and developer modifying code in this project MUST strictly follow these
rules.

---

## 1. Golden Rules of Clean Code & Architecture

### Rule 1: Strict File Size Limits
- **Next.js Page Files (`apps/*/app/**/page.tsx`) MUST be thin (< 100 lines).**
  - Page files must ONLY handle route layout/imports and delegate actual
    view rendering to feature modules
    (`apps/<portal>/modules/<feature>/ui/views/<feature>-view.tsx`).
- **All other files MUST stay under 250–300 lines.**
  - If a component, custom hook, or utility exceeds 300 lines, decompose
    it into focused sub-components or sub-hooks immediately.
  - Monolithic "god components" (500+ line files mixing queries, modal
    state, form handling, and table JSX) are strictly prohibited.

### Rule 2: Single Responsibility & 4-Layer Architecture
Operations must be decomposed into 4 distinct layers:

1. **Pure Calculator Layer** (`apps/<portal>/lib/calculators/`):
   - Pure math/domain functions (GPA, CGPA, ECU 3-stage installment
     milestones — 40% / 75% / 100% — fee balances, semester rollover).
   - `input -> output` pure calculations with **ZERO** database calls,
     **ZERO** network requests, and **ZERO** side-effects.
2. **Data Persister Layer** (Convex `mutation`):
   - Receives pre-calculated data, validates authorization via
     `assertRole` / `assertAuthenticated`, and commits updates to
     `ctx.db`.
   - Must **NOT** execute third-party HTTP requests (SMS, mobile money
     webhooks, email) or format presentation copy.
3. **External Communicator Layer** (Convex `action`):
   - Executes external third-party HTTP integrations (m-Gurush
     callbacks, Equity Bank / KCB / Stanbic webhooks, SMS providers,
     email verification).
   - Handles network payloads, retries, idempotency, and external API
     error logging.
4. **Orchestrator Layer** (Custom Hook / UI Workflow):
   - Located in `apps/<portal>/modules/<feature>/hooks/` or
     `apps/<portal>/hooks/`.
   - Coordinates calculation → persistence → external notification in
     sequential, observable steps with UI feedback (loading spinners,
     toast alerts).

### Rule 3: Reusable UI Component First Principle
- **Button (`@workspace/ui/components/button`)**:
  - NEVER write raw `<button className="...">` or standard HTML buttons.
  - Always use the shadcn `<Button>` primitive
    (`<Button variant="default|destructive|outline|secondary|ghost|link" size="..." isLoading={...}>`).
- **Input (`@workspace/ui/components/input`)** — text, number, date,
  search, etc. Never use raw `<input>`.
- **Textarea (`@workspace/ui/components/textarea`)** — for comments,
  descriptions, notes.
- **Select (`@workspace/ui/components/select`)** — dropdowns. Never use
  raw `<select>`.
- **AlertDialog (`@workspace/ui/components/alert-dialog`)** — destructive
  or critical confirmations (deletions, bans, void receipts). Never use
  `window.confirm()`.
- **Table (`@workspace/ui/components/table`)** — all data listings.
- **Dialog (`@workspace/ui/components/dialog`)** — modal forms,
  detail sheets.
- **Card (`@workspace/ui/components/card`)** — section containment.
- **Tabs (`@workspace/ui/components/tabs`)** — section switching inside
  a view (Finance: Overview / Ledgers / Reconciliation / Sponsors /
  Structures / Transactions).
- **Sidebar (`@workspace/ui/components/sidebar`)** — admin nav.

### Rule 4: Standardized Form Handling (`react-hook-form` + `zod`)
- **ALL forms MUST use `react-hook-form` with `zod` schema validation.**
- Integrate with shadcn form primitives
  (`@workspace/ui/components/form`: `Form`, `FormField`, `FormItem`,
  `FormLabel`, `FormControl`, `FormMessage`).
- Avoid `.default()` in Zod schemas when type input/output matching is
  required to prevent schema mismatch errors.
- Connect submit buttons directly to `form.formState.isSubmitting` using
  `<Button isLoading={isSubmitting}>`.

### Rule 5: ECU Brand Theming (OKLCH CSS Variables, Zero Hardcoded Hex)
- **Zero Static Hex Colors in Portal Views**: Never hardcode colors like
  `#800000`, `#f97316`, or `#1E88E5` in dashboards, marksheets, tables,
  dialogs, or components.
- **ECU Brand Color**: Maroon `var(--primary)` (`#800000` defined in
  `globals.css`).
- **Tailwind Theme Tokens**: Always style UI elements with dynamic
  theme tokens: `bg-primary`, `text-primary`, `border-primary`,
  `bg-secondary`, `text-secondary`, `bg-muted`, `text-muted-foreground`,
  `bg-background`, `text-foreground`, `border-border`.
- **Typography**:
  - SANS (UI): **Inter**
  - SERIF (academic headings, marksheets): **Source Serif 4**
  - MONO (registration numbers, audit details): **JetBrains Mono**

### Rule 6: Strict TypeScript Safety, Convex Search & Backend DSA Performance
- **Zero `any` and Zero `api as any`**: Always use explicit types from
  `@workspace/backend/_generated/dataModel` or typed interfaces.
- **Prevent TS2589 Recursion**: Never trigger Convex deep union
  recursion by passing client-side union arguments into monolithic
  `api` queries. Always import typed `FunctionReference`s from
  `@workspace/backend/_generated/api`.
- **Indexed Reads Only**: Never `.filter()` without first prefixing with
  `.withIndex()`. Every lookup must be O(1) or O(log N).
- **Mandatory Pagination**: For tables expected to grow beyond 50
  records (students, transactions, audit logs, ledgers), use
  `paginate()` + `cursor`. Forbidding `.collect()` on those datasets.
- **Backend DSA & O(1) Hash Maps**: Never execute DB queries inside
  loops. Batch-fetch unique IDs with `Promise.all` and build an
  `Map<Id, Doc>` for enrichment.
- **Atomic Integrity**: Group multiple `db` writes into a single
  `internalMutation`. Never perform two separate writes from an action
  without wrapping them.
- **Fail-Fast with `ConvexError`**: Use `ConvexError({ message, code,
  tip })` for every rejection so the UI gets structured feedback.
- **Mandatory Verification**: Every code modification or refactor MUST
  be verified with `pnpm --filter @workspace/backend exec tsc --noEmit`
  (plus the relevant app filter) before finishing.

---

## 2. Standard Directory Layout (ECU Monorepo)

```
emmanual_christian_university1/
├── apps/                              # Next.js portals (consumer-facing)
│   ├── staff-portal/                  # Admin + Lecturer + HOD + Finance
│   │   ├── app/                       # Routes — page.tsx < 100 lines
│   │   │   ├── (auth)/                # sign-in, sign-up
│   │   │   └── (dashboard)/
│   │   │       ├── (admin)/admin/     # Admin-only routes
│   │   │       └── (staff)/staff/     # Lecturer / HOD routes
│   │   ├── modules/                   # Domain modules (feature-based)
│   │   │   └── <feature>/
│   │   │       ├── hooks/             # Module-specific custom hooks
│   │   │       └── ui/
│   │   │           ├── components/    # Dialogs, tables, cards
│   │   │           └── views/         # <feature>-view.tsx
│   │   └── lib/                       # App-level helpers, calculators
│   ├── student-portal/                # Student self-service
│   ├── finance/                       # Cashier portal (planned)
│   ├── inventory/                     # Asset tracking (planned)
│   ├── library/                       # Library catalog (planned)
│   └── lms/                           # LMS — courses, assignments
├── packages/
│   ├── backend/                       # Convex (source of truth)
│   │   └── convex/
│   │       ├── schema.ts              # All tables & indexes
│   │       ├── <domain>.ts            # academic, finance, marks, ...
│   │       ├── lib/utils.ts           # assertRole, assertAuthenticated
│   │       ├── audit_logger.ts        # logAction
│   │       └── betterAuth/            # Auth component
│   ├── ui/                            # shadcn design system primitives
│   │   └── src/components/
│   └── typescript-config/             # Shared tsconfigs
└── .agents/                           # THIS directory — agent skills
```

---

## 3. ECU Domain Vocabulary (use these exact terms)

When naming files, variables, and UI labels, use the canonical ECU
vocabulary — not generic edtech terms:

| Generic term | ECU term |
| --- | --- |
| School / Tenant | **Faculty** |
| Department | **Department** (within a Faculty) |
| Course / Subject | **Course** (with credit units, e.g. `BBA 101`) |
| Class / Cohort | **Program** (e.g. BBA, BAT, BEDU-MIT) |
| Term / Semester | **Semester** (1 or 2) within an academic year |
| Academic Year | **Academic Period** (e.g. "Semester 1, 2026") |
| Grade Letter | A, B+, B, C+, C, D, F (per `gradingScales`) |
| Pass Mark | **60%** final score |
| Student Fee Account | **Student Ledger** |
| Sponsor (NGO / Church / Govt) | **Sponsor** |
| Payment Channel | cash / m-Gurush / Equity Bank / KCB / Stanbic / bank_deposit |
| Currency | **SSP** (default) or **USD** |
| Installment | 40% (Registration) / 75% (Midterm) / 100% (Final Exam) |
| Attendance rule | ≥75% present/late to be eligible for exam |

---

## 4. Mandatory Refactoring Checklist

Before declaring any coding or refactoring task complete, verify:

- [ ] Is `page.tsx` under 100 lines?
- [ ] Is every component file under 250–300 lines?
- [ ] Are all buttons using shadcn `<Button>` from `@workspace/ui`?
- [ ] Are all dropdowns using shadcn `<Select>` from `@workspace/ui`?
- [ ] Are all destructive confirms using `<AlertDialog>`?
- [ ] Are all forms built with `react-hook-form` + `zod` + `<Form>`?
- [ ] Are business calculations isolated as pure functions in
      `apps/<portal>/lib/calculators/`?
- [ ] Are all Convex API calls using explicit types without `any`?
- [ ] Are all UI styles using dynamic Tailwind theme tokens (no hardcoded
      hex)?
- [ ] Did the typecheck finish with 0 new errors?
- [ ] Does naming follow the ECU vocabulary (Faculty / Department /
      Program / Course / Semester / Academic Period / Ledger / Sponsor)?
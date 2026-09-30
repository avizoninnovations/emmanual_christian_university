---
description: Lifecycle for implementing new domain features in the ECU monorepo from schema to UI.
---

# Workflow: Adding a New Feature (ECU)

This workflow defines the end-to-end lifecycle for implementing a new
domain feature in the **Emmanuel Christian University** monorepo. It
ensures data remains performant (DSA), UI stays on-brand (ECU Maroon),
and administrative actions are properly audited.

## When to use

Use this workflow whenever you introduce a new table to the schema or
add a significant piece of functionality that spans backend and
frontend — e.g. adding a **Scholarships** module, **Transcript
Generation**, **Online Payments (m-Gurush)**, or **Lesson Plans**.

## 1. Schema Definition (Convex)

- Locate `packages/backend/convex/schema.ts`.
- Define the new table with appropriate `v` types.
- **Mandatory**: add indices for common lookup fields (IDs, statuses,
  dates). Example: `.index("by_student", ["studentId"])`.
- If the table is expected to grow beyond 50 records, also add a
  `searchIndex` with the right `filterFields`
  (see `.agents/convex-type-safety/SKILL.md`).

## 2. Backend Implementation

- Create or update the service file in `packages/backend/convex/`
  (e.g. `scholarships.ts`, `transcripts.ts`).
- **Security Pass** — Every public function MUST start with a permission
  check from `lib/utils.ts`:
  `await assertRole(ctx, ["admin", "bursar", "finance"])`.
- **Atomic Writes** — If a mutation involves multiple tables, group
  them into a single `internalMutation` so all writes succeed or fail
  together.
- **Fail-Fast** — Use `ConvexError` for all rejections to provide
  clean UI feedback.
- **Queries** — Use `.withIndex()` + `.paginate()`. Never
  `.collect()` for tables expected to grow.
- **Audit Logging** — End sensitive mutations with
  `await logAction(ctx, { action, resource, details })`.

## 3. Atomic UI Components

- Check `packages/ui/src/components` for existing shadcn primitives
  (Button, Input, Select, Dialog, AlertDialog, Table, Tabs, Card,
  Badge, Sidebar, Form).
- If a new generic primitive is needed (e.g. a specialized date picker
  for the academic calendar), build it in `packages/ui` first.
- Use Tailwind CSS variables (`--primary`, `--radius`, `--shadow-sm`)
  to ensure ECU Maroon theme consistency.

## 4. Domain Module View

- Navigate to the relevant portal's modules folder:
  - Admin-facing: `apps/staff-portal/modules/<feature>/`
  - Student-facing: `apps/student-portal/modules/<feature>/`
- Build the **View** in `ui/views/<feature>-view.tsx`.
- Build **dialogs** and **tables** in `ui/components/`.
- Extract custom hooks into `hooks/use<Feature>View.ts` for clean
  separation.
- Connect to the backend using `useQuery` / `useMutation` from
  `@workspace/backend/_generated/api`.

## 5. Security & Audit

- If the feature handles sensitive data (finance, user status, marks
  approval), wrap every mutation in a `logAction()` call from
  `audit_logger.ts`.
- Ensure the route is placed under the correct role-protected group:
  - `(auth)` — sign-in / sign-up.
  - `(dashboard)/(admin)/admin/...` — admin-only.
  - `(dashboard)/(staff)/staff/...` — lecturer / HOD / cashier.
- Re-verify with
  `pnpm --filter @workspace/backend exec tsc --noEmit` and the
  relevant app's typecheck before declaring done.
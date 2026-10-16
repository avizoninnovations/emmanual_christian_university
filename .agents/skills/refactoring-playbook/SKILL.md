---
name: refactoring-playbook
description: >-
  Step-by-step guide for decomposing monolithic page files in the ECU
  monorepo into thin Next.js routes (< 100 lines), feature modules,
  custom hooks, and modular UI components.
---

# Clean Code Refactoring Playbook — Emmanuel Christian University

This playbook provides a systematic, repeatable workflow for refactoring
monolithic files in the **ECU** monorepo into clean, modular, and
maintainable code architecture.

---

## Step 1: Identify ECU Layer Boundaries

Before touching code, split the target file into the 4 ECU layers:

1. **Routing / Page Container**
   (`apps/<portal>/app/**/page.tsx`): route group metadata +
   delegating rendering to the feature module view. **< 100 lines.**
2. **Feature Module View / Container**
   (`apps/<portal>/modules/<feature>/ui/views/<feature>-view.tsx`):
   state management, dialog visibility, table rendering, tab
   switching.
3. **Pure Calculators**
   (`apps/<portal>/lib/calculators/` or
   `apps/<portal>/modules/<feature>/lib/`): GPA / CGPA calculation,
   ECU 3-stage installment milestones (40% / 75% / 100%), fee balance
   derivation, semester rollover math.
4. **Presentational Components**
   (`apps/<portal>/modules/<feature>/ui/components/`):
   `<feature>-dialog.tsx`, `<feature>-table.tsx`,
   `<feature>-card.tsx`.

---

## Step 2: Extract Business Logic into Custom Hooks

Move all `useQuery`, `useMutation`, `useState`, derived data, and
handler callbacks out of the JSX into a dedicated custom hook in
`apps/<portal>/modules/<feature>/hooks/`.

```typescript
// apps/staff-portal/modules/finance/hooks/useFinanceView.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";

export function useFinanceView() {
  const [activeTab, setActiveTab] = useState<"overview" | "ledgers" | "reconciliation">("overview");
  const [periodId, setPeriodId] = useState<Id<"academicPeriods"> | undefined>();

  const summary = useQuery(api.finance.getFinancialSummary, { periodId });
  const ledgers = useQuery(api.finance.getStudentLedgers, { periodId });

  return {
    activeTab, setActiveTab,
    periodId, setPeriodId,
    summary,
    ledgers: ledgers ?? [],
    isLoading: ledgers === undefined || summary === undefined,
  };
}
```

The view component imports `useFinanceView()` and stays presentational.

---

## Step 3: Replace Ad-hoc UI Elements with Design System Primitives

- Replace raw `<button>` elements with `<Button>` from
  `@workspace/ui/components/button`.
- Replace raw `<select>` elements with `<Select>` from
  `@workspace/ui/components/select`.
- Replace raw `<input>` elements with `<Input>` from
  `@workspace/ui/components/input`.
- Replace raw `<textarea>` elements with `<Textarea>`.
- Replace `window.confirm()` and inline modal markup with
  `<AlertDialog>`.
- Replace custom table markup with `<Table>` from
  `@workspace/ui/components/table`.
- Replace ad-hoc hex colours (`#800000`, `#1E88E5`) with Tailwind
  theme tokens (`bg-primary`, `text-primary`, `border-border`).
- Replace custom form state with `react-hook-form` + `zod` +
  shadcn `<Form>`.

---

## Step 4: Decompose Thin Route Page (`page.tsx`)

Shrink `apps/<portal>/app/<route>/page.tsx` to a thin shell:

```tsx
// apps/staff-portal/app/(dashboard)/(admin)/admin/finance/page.tsx
import { FinanceView } from "@/modules/finance/ui/views/finance-view";

export default function FinancePage() {
  return <FinanceView />;
}
```

`page.tsx` may include:
- Static metadata (`export const metadata = { title: "Finance" }`).
- Auth / role gating wrappers.
- Layout components that wrap the view.

But it must NOT include: `useState`, `useQuery`, `useMutation`,
inline JSX for tables or forms.

---

## Step 5: Extract Pure Calculators

If the page contains any business math (GPA, fee balance, installment
progress, attendance %), extract it into a pure function in
`apps/<portal>/lib/calculators/`:

```typescript
// apps/staff-portal/lib/calculators/installments.ts
export type InstallmentMilestones = {
  registration: { target: number; percentage: 40; cleared: boolean; balanceToClear: number };
  midterm: { target: number; percentage: 75; cleared: boolean; balanceToClear: number };
  finalExam: { target: number; percentage: 100; cleared: boolean; balanceToClear: number };
  currentStage: string;
  paymentProgressPercentage: number;
};

export function calculateInstallmentMilestones(
  totalDue: number,
  totalPaid: number
): InstallmentMilestones {
  const regTarget = Math.round(totalDue * 0.40);
  const midTarget = Math.round(totalDue * 0.75);
  const examTarget = totalDue;

  // ... (mirrors the helper already in convex/finance.ts)
}
```

The same calculator can be reused on the server and client.

---

## Step 6: Verification & Type Safety Check

Always run the mandatory typecheck before declaring done:

```powershell
pnpm --filter @workspace/backend exec tsc --noEmit
pnpm --filter staff-portal exec tsc --noEmit
pnpm --filter student-portal exec tsc --noEmit
```

Ensure **0 new errors** are produced. Pre-existing extension /
implicit-any warnings on `convex/*` are project-wide noise — do NOT
introduce new ones elsewhere.

---

## ECU Refactor Cheat Sheet

| Symptom in a file | Move to |
| --- | --- |
| `useQuery(api.finance.*)` | `modules/finance/hooks/useFinanceView.ts` |
| Inline JSX table | `modules/finance/ui/components/ledgers-table.tsx` |
| `Math.round(totalDue * 0.4)` magic number | `lib/calculators/installments.ts` |
| Zod schema for a form | `modules/finance/ui/components/payment-form-dialog.tsx` (co-located) |
| Static metadata / route config | `app/(dashboard)/.../page.tsx` |
| `assertRole` call | Backend (`packages/backend/convex/<domain>.ts`) — not the view |
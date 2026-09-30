---
name: refactoring-playbook
description: >-
  Step-by-step guide for decomposing large monolithic Next.js page files into thin routes (< 100 lines), 4-layer architecture, custom hooks, and modular UI presentation components.
---

# Clean Code Refactoring Playbook

This playbook provides a systematic, repeatable workflow for refactoring monolithic files in **School Manager Uganda** into clean, modular, and maintainable code architecture.

---

## Step 1: Analyze & Identify Layer Boundaries
Before touching code, inspect the target file and split its responsibilities into 4 layers:

1. **Routing / Page Container** (`src/app/**/page.tsx`): Route parameters, basic metadata, and delegating rendering to the module container (< 100 lines).
2. **Business Hook / Orchestrator** (`src/modules/<feature>/hooks/`): State management, dialog visibility, Convex queries/mutations, toast notifications.
3. **Pure Calculators** (`src/core/domains/`): Mark calculations, grade aggregates, fee balances, descriptors.
4. **Presentational Components** (`src/modules/<feature>/components/`): Table UI, Filter Toolbar, Dialogs, Cards.

---

## Step 2: Extract Business Logic into Custom Hooks
Move all `useQuery`, `useMutation`, `useState`, and handler callbacks out of the JSX into a dedicated custom hook in `src/modules/<feature>/hooks/`.

---

## Step 3: Replace Ad-hoc UI Elements with Design System Primitives
- Replace raw `<button>` elements with `<SoftButton>`.
- Replace raw `<select>` elements with `<SoftSelect>`.
- Replace browser `confirm()` or inline modal markup with `<ConfirmDialog>`.
- Replace custom form state with `react-hook-form` + `zod` + shadcn `<Form>`.
- Replace static hex colors (`#2e3192`) with Tailwind dynamic tokens (`bg-primary`, `text-primary`, `border-border`).

---

## Step 4: Decompose Thin Route Page (`page.tsx`)
Shrink `src/app/**/page.tsx` to a simple shell:

```tsx
import { FeatureModuleContainer } from '@/modules/feature/components/FeatureModuleContainer';

export default function FeaturePage() {
  return <FeatureModuleContainer />;
}
```

---

## Step 5: Verification & Type Safety Check
Always run the mandatory TypeScript compilation check:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Ensure 0 errors are produced across the workspace.

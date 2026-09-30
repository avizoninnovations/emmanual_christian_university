---
name: clean-code
description: >-
  Enforces Clean Code principles, 4-Layer Architecture, and strict TypeScript standards across School Manager Uganda. Use whenever writing, refactoring, or reviewing code to ensure small modular files (< 250 lines, page.tsx < 100 lines), separation of presentation from business logic, zero 'any' types, react-hook-form + zod forms, reusable UI primitives (SoftButton, SoftSelect, ConfirmDialog), dynamic school theming, and typed Convex API references.
---

# Clean Code Standards for School Manager Uganda

This skill defines the mandatory coding, architecture, design system, and verification standards for the **School Manager Uganda** codebase. Every AI agent, tool, and developer modifying code in this project MUST strictly follow these rules.

---

## 1. Golden Rules of Clean Code & Architecture

### Rule 1: Strict File Size Limits
- **Next.js Page Files (`src/app/**/page.tsx`) MUST be thin (< 100 lines).**
  - Page files must ONLY handle route layout/imports and delegate actual view rendering to feature modules (`src/modules/<feature>/components/<Feature>Container.tsx`).
- **All other files MUST stay under 250–300 lines.**
  - If a component, custom hook, or utility exceeds 250 lines, decompose it into focused sub-components or sub-hooks immediately.
  - Monolithic "god components" (giant 500+ line files mixing queries, modal state, form handling, and table JSX) are strictly prohibited.

### Rule 2: Single Responsibility & 4-Layer Architecture
Operations must be decomposed into 4 distinct layers:
1. **Pure Calculator Layer** (`src/core/domains/`):
   - Pure math/domain functions (grades, PLE division, CBC 3-point descriptors, UACE 20-point aggregates, fee balances, term calculations).
   - `input -> output` pure calculations with **ZERO** database calls, **ZERO** network requests, and **ZERO** side-effects.
2. **Data Persister Layer** (Convex Mutation):
   - Receives pre-calculated data, validates authorization and school tenancy, and commits updates to `ctx.db`.
   - Must **NOT** execute third-party HTTP requests (SMS, USSD, email) or format presentation copy.
3. **External Communicator Layer** (Convex Action):
   - Executes external third-party HTTP integrations (Eversend USSD, SMS delivery, email verification, PegPay).
   - Handles network payloads, retries, idempotency, and external API error logging.
4. **Orchestrator Layer** (Custom Hook / UI Workflow):
   - Located in `src/modules/<feature>/hooks/` or `src/hooks/`.
   - Coordinates calculation -> persistence -> external notification in sequential, observable steps with UI feedback (loading spinners, toast alerts).

### Rule 3: Reusable UI Component First Principle
- **SoftButton (`@/components/ui/SoftButton`) & Button (`@/components/ui/button`)**:
  - NEVER write raw `<button className="...">` or standard HTML buttons.
  - Always use `<SoftButton>` or shadcn `<Button>` primitives (`<SoftButton variant="primary|secondary|soft|outline|danger|warning|ghost" isLoading={...} icon={...}>` or `<Button variant="default|destructive|outline|secondary|ghost|soft" size="..." isLoading={...}>`).
- **SoftSelect (`@/components/ui/SoftSelect`)**:
  - Always use `SoftSelect` for select dropdowns instead of raw `<select>` tags or unstyled dropdowns.
- **ConfirmDialog (`@/components/ui/ConfirmDialog`)**:
  - Always use `ConfirmDialog` for action confirmations (deletions, state changes, status toggles).
- **MasterDataTable / ReusableTable**:
  - Use standardized table components (`@/components/ui/MasterDataTable` or `@/components/ui/ReusableTable`) for data listings.

### Rule 4: Standardized Form Handling (`react-hook-form` + `zod`)
- **ALL forms MUST use `react-hook-form` with `zod` schema validation.**
- Integrate with shadcn form primitives from `@/components/ui/form` (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`).
- Avoid `.default()` in Zod schemas when type input/output matching is required to prevent schema mismatch errors.
- Connect submit buttons directly to `form.formState.isSubmitting` using `<SoftButton isLoading={isSubmitting}>`.

### Rule 5: Dynamic Multi-Tenant Theming (Zero Hardcoded Hex Colors)
- **Zero Static Hex Colors in Portal Views**: Never hardcode colors like `#2e3192`, `#f97316`, or `#1E88E5` in dashboards, marksheets, tables, dialogs, or components.
- **School Theme Context**: Every school institution configures its own primary color, secondary color, logo, and font loaded dynamically via `SchoolThemeProvider`.
- **Tailwind Theme Tokens**: Always style UI elements with dynamic theme tokens: `bg-primary`, `text-primary`, `bg-secondary`, `text-secondary`, `bg-accent`, `border-border`, `bg-background`, `text-foreground`.

### Rule 6: Strict TypeScript Safety, Convex Search & Backend DSA Performance
- **Zero `any` and Zero `api as any`**: Always use explicit types from `@/core/types.ts` or typed interfaces.
- **Prevent TS2589 Recursion**: Never trigger Convex deep union recursion by passing client-side union arguments into monolithic `api` queries. Always import typed `FunctionReference`s from `@/core/api/` (`queryRefs.ts`, `mutationRefs.ts`).
- **Convex Full-Text Search Best Practices**: Always define `searchIndex` with mandatory multi-tenant `filterFields` (e.g. `schoolId`, `status`) in `convex/schema.ts` to enforce $O(\log N)$ indexed filtering.
- **Backend DSA & $O(1)$ Hash Maps**: Never execute database queries inside loops. Batch-fetch unique IDs using `Promise.all` and build an $O(1)$ `Map<string, Doc>` for enrichment.
- **Mandatory Verification**: Every code modification or refactor MUST be verified with `node node_modules/typescript/bin/tsc --noEmit` before finishing the task.

---

## 2. Standard Directory Layout

```
src/
├── app/                  # Next.js App Router (Routing, Layouts, Metadata ONLY)
│                         # Keep page.tsx files thin (< 100 lines)
├── components/           # Reusable UI primitives
│   └── ui/               # SoftButton, SoftSelect, ConfirmDialog, Form primitives
├── core/                 # Pure domain business logic & types (ZERO UI dependencies)
│   ├── api/              # Typed Convex queryRefs & mutationRefs (TS2589 prevention)
│   ├── domains/          # Pure calculators (PLE, CBC, A-Level, Fees)
│   ├── permissions.ts    # RBAC rules
│   └── types.ts          # Centralized domain TypeScript interfaces
├── hooks/                # Global reusable React hooks
├── infrastructure/       # Convex schemas, Auth, Eversend, SMS, PegPay integrations
├── modules/              # Feature modular containers
│   └── [feature]/        # e.g., finance, students, academics, oversight
│       ├── components/   # Presentational UI pieces specific to feature
│       ├── hooks/        # Module-specific hooks (queries & mutations)
│       └── types/        # Feature-specific interfaces
└── utils/                # Utility functions (date, currency formatting)
```

---

## 3. Mandatory Refactoring Checklist

Before declaring any coding or refactoring task complete, verify:
- [ ] Is `page.tsx` under 100 lines?
- [ ] Is every component file under 250–300 lines?
- [ ] Are all buttons using `<SoftButton>`?
- [ ] Are all dropdowns using `<SoftSelect>`?
- [ ] Are all forms built using `react-hook-form` + `zod` + shadcn `<Form>`?
- [ ] Are business calculations isolated as pure functions in `src/core/domains/`?
- [ ] Are all Convex API calls using explicit types without `any` or deep union recursion?
- [ ] Are all UI styles using dynamic theme tokens (no hardcoded hex colors)?
- [ ] Did `node node_modules/typescript/bin/tsc --noEmit` finish with 0 errors?

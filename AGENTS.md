# Emmanuel Christian University Monorepo

## Read these instructions first

Before implementing a change, inspect the relevant app, module, backend functions, shared UI, and existing project guidance. Read only the skills needed for the task, using the canonical paths below. Do not begin a Convex change until you have read `packages/backend/AGENTS.md` and `packages/backend/convex/_generated/ai/guidelines.md`.

- Any code change: `.agents/skills/clean-code/SKILL.md`
- ECU-wide architecture, UI theme, security, and vocabulary: `.agents/rules/code-style-guide.md`
- UI work: `.agents/skills/component-reusability/SKILL.md`
- Forms: `.agents/skills/form-standards/SKILL.md`
- Refactoring or decomposing a large feature: `.agents/skills/refactoring-playbook/SKILL.md`
- Convex queries, mutations, schema, auth, or performance: `.agents/skills/convex-type-safety/SKILL.md`
- Cross-layer feature work: `.agents/workflows/feature-lifecycle.md`
- Large lists: `.agents/workflows/paginated-view-pattern.md`
- Sensitive writes: `.agents/workflows/secure-mutation-pattern.md` and `.agents/workflows/administrative-audit-loop.md`
- Better Auth data access: `.agents/workflows/better-auth-adapter-pattern.md`

These shared skills live under `.agents/skills/`. Convex's installed skills under `packages/backend/.agents/skills/` and `packages/backend/.claude/skills/` are generated for their respective agents; leave them in place and use them when relevant.

## Repository map

- `apps/` contains the Next.js portals. Routes live in `app/`; feature code lives in `modules/<feature>/`.
- `packages/backend/convex/` is the Convex source of truth and Better Auth integration.
- `packages/ui/src/` contains shared shadcn/Tailwind primitives and the design tokens.
- The workspace package manager is pnpm (`pnpm@10.4.1`).

## Implementation standards

- Keep route `page.tsx` files as thin metadata/layout/delegation shells, generally under 100 lines. Place feature behavior in a module view, and extract reusable UI, hooks, and pure domain calculations when they have distinct responsibilities.
- Keep new or substantially refactored files focused and readable (aim for fewer than 300 lines); split files when responsibilities or state become difficult to follow. Avoid broad rewrites when a focused change will solve the task.
- Reuse `@workspace/ui` primitives before creating one-off controls. Keep forms accessible and validated with React Hook Form, Zod, and shared Form primitives. Provide clear loading, empty, error, disabled, and success states.
- Use ECU theme tokens from `packages/ui/src/styles/globals.css` for normal portal UI. If a reference design needs special accent colors, centralize them instead of scattering raw color values across components.
- Keep TypeScript explicit. Avoid `any`, unsafe casts, duplicated domain logic, and database/network work inside render components.
- Preserve single-university ECU domain terms and existing role model. Do not import another project's tenancy, grading, currency, school terminology, or component names without confirming they match this repository.
- For backend reads, prefer indexed queries, paginate large/unbounded datasets, and batch related document reads. Enforce authentication/roles server-side. Keep multi-document writes atomic and audit sensitive administrative changes.
- Inspect `git status` before editing and preserve unrelated user changes. Do not overwrite, reset, or remove files merely because they are untracked or modified.

## Verification

Run the relevant typecheck after code changes:

- Backend: `pnpm --filter @workspace/backend typecheck`
- Student portal: `pnpm --filter student-portal typecheck`
- Other portal: `pnpm --filter <package-name> typecheck`

Run tests only when requested or when a repository task explicitly requires them. Report any checks that could not run and why.

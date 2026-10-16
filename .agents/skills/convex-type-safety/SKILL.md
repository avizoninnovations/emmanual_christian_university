---
name: convex-type-safety
description: >-
  ECU Convex standards for typed APIs, authorization, indexed and paginated
  reads, bounded work, and efficient data enrichment. Use for backend schema,
  query, mutation, action, or performance changes.
---

# Convex Type Safety and Data Access — ECU

Use this skill together with `packages/backend/AGENTS.md` and the generated Convex guidelines at `packages/backend/convex/_generated/ai/guidelines.md`. The generated guidelines are authoritative for current Convex APIs.

## Type safety

- Use generated `api`, `internal`, `Id`, and document types. Avoid `any`, `api as any`, and unchecked identity casts.
- If a generated function reference triggers deep TypeScript inference (`TS2589`), define a narrowly typed `makeFunctionReference` at the boundary that needs it; do not weaken types across the whole module.
- Keep validators on every public and internal Convex function. Validate external payloads before using them.
- Use `ConvexError` for expected domain failures where structured client feedback is useful. Follow existing local error conventions if the generated guidelines or current code require another pattern.

## Authorization and data ownership

- Every public function must authenticate or check an allowed role before reading or changing protected data. Use the existing helpers in `packages/backend/convex/lib/utils.ts`.
- ECU is currently a single-university system. Do not add a `schoolId` or multi-tenant pattern copied from another project. Derive the current actor from auth context; never trust a client-supplied user ID to authorize access.
- A student's records must be scoped to the authenticated student. Staff and administrator operations must use the existing role model and audit rules.
- Better Auth user/session/account data is stored through the mounted Better Auth component. Follow `.agents/workflows/better-auth-adapter-pattern.md`; do not use `ctx.db` as if component records were ordinary app-table documents.

## Query performance

- Add and use indexes for common equality and compound filters. Prefer index constraints over collecting broad tables and filtering in JavaScript.
- Paginate datasets that can grow with students, transactions, ledgers, attendance, or audit history. Only collect data when the result is bounded by design.
- Avoid N+1 reads: collect unique IDs, fetch documents concurrently in bounded batches, then enrich results with a `Map`.
- Bound search results and input size. Debounce interactive searches in the UI and avoid issuing searches for very short strings.
- Split bulk work into safe batches that respect Convex transaction limits; keep related writes in one mutation when they must succeed or fail together.

## Before adding a feature

1. Inspect the schema, related functions, roles, callers, and existing workflows.
2. Add the smallest schema/index change that supports the needed access patterns.
3. Implement server-side validation, authorization, and audit logging for sensitive writes.
4. Keep calculations pure where practical and keep external network calls in actions rather than mutations.
5. Typecheck `@workspace/backend` and the calling app after the change.

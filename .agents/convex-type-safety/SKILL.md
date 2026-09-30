---
name: convex-type-safety
description: >-
  Standardizes Convex API type safety, indexed reads, backend DSA patterns,
  preventing TS2589 deep-union recursion, single-tenant authorization, and
  high-performance pagination across the Emmanuel Christian University
  monorepo.
---

# Convex Type Safety, Indexing & Backend DSA Standards — ECU

To guarantee strict TypeScript safety, predictable performance, and
O(log N) database queries across the **Emmanuel Christian University**
monorepo, all Convex queries, mutations, and actions MUST follow the
rules below. ECU is **single-tenant** (one university) — there is no
`schoolId` partitioning. All authorization is via role checks on the
`staffProfiles` table and authentication via Better Auth.

---

## 1. Preventing Convex TS2589 Recursion

### Problem
Passing client-side dynamic parameters into monolithic
`api.path.to.function` query hooks can cause TypeScript to attempt
infinite union resolution
(`TS2589: Type instantiation is excessively deep and possibly infinite`).

### Solution
1. **Never use `api as any` or `: any`.**
2. **Always import typed function references from
   `@workspace/backend/_generated/api`** — Convex generates these.
3. **For shared cross-portal reads, prefer a thin wrapper query in
   `packages/backend/convex/<domain>.ts`** rather than reaching into
   `_generated` directly.

### Example Usage
```typescript
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

export function useStudentLedgers(args: { periodId?: Id<"academicPeriods"> }) {
  const ledgers = useQuery(api.finance.getStudentLedgers, args);
  return {
    ledgers: ledgers ?? [],
    isLoading: ledgers === undefined,
  };
}
```

If TS2589 appears, split the query into smaller typed arguments
(pass `Id<"...">` instead of raw `string`), or move the call into a
typed wrapper in `packages/backend`.

---

## 2. Convex Indexing Rules (No Full-Table Scans)

ECU has tables that grow unbounded: `students`, `transactions`,
`studentLedger`, `auditLogs`, `attendanceRecords`. **Never** allow a
query against those tables without an index.

### Pattern
```typescript
// ✅ CORRECT — indexed read
const student = await ctx.db
  .query("students")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .unique();

// ✅ CORRECT — indexed + paginated
const txs = await ctx.db
  .query("transactions")
  .withIndex("by_student", (q) => q.eq("studentId", studentId))
  .order("desc")
  .paginate(args.paginationOpts);

// ❌ WRONG — full table scan
const student = await ctx.db
  .query("students")
  .filter((q) => q.eq(q.field("userId"), userId))
  .unique();
```

### Always-Paginate Tables
For these tables, queries that return more than 50 rows MUST use
`paginate()`:

- `students`
- `transactions`
- `studentLedger`
- `attendanceRecords`
- `auditLogs`
- `studentAssessments`
- `loans`
- `studentCourseRegistrations`

Other tables (`faculties`, `departments`, `programs`, `courses`,
`academicPeriods`, `sponsors`, `staffProfiles`, `feeStructures`,
`gradingScales`) are bounded config data and `collect()` is fine.

---

## 3. Backend DSA — O(1) Lookups for Enrichment

When enriching query results with related records (program names,
sponsor names, user names), **never** issue a `ctx.db.get()` per row.

### Pattern — Build a Map
```typescript
// 1. Collect unique IDs
const uniqueProgramIds = Array.from(
  new Set(students.map((s) => s.programId).filter(Boolean))
);

// 2. Parallel batch fetch (single round trip per ID, parallel)
const programs = await Promise.all(
  uniqueProgramIds.map((id) => ctx.db.get(id))
);

// 3. O(1) hash map for enrichment
const programMap = new Map(
  programs.filter(Boolean).map((p) => [p!._id.toString(), p!])
);

// 4. Enrich in O(N)
const enriched = students.map((s) => ({
  ...s,
  programName: s.programId
    ? programMap.get(s.programId.toString())?.name ?? "Unknown Program"
    : null,
}));
```

This is the standard for every `getStudentLedgers`,
`getAllTransactions`, `getFinancialSummary`, and
`getMyRegisteredCourses` style query.

---

## 4. Chunked Mutations (Batches > 100 Items)

Operations like **bulk semester invoicing**, **annual rollover**, and
**batch promotion** can touch hundreds of students. Never run those in
a single unbounded mutation.

```typescript
const CHUNK_SIZE = 100;

for (let i = 0; i < students.length; i += CHUNK_SIZE) {
  const chunk = students.slice(i, i + CHUNK_SIZE);
  await ctx.runMutation(internal.<domain>._bulkProcessChunk, {
    periodId,
    studentIds: chunk.map((s) => s._id),
  });
}
```

Keeps transaction time and memory under Convex's per-mutation limits.

---

## 5. Single-Tenant Authorization

ECU is **one** university. There is no `schoolId`. Authorization is
purely role-based via `assertRole(ctx, [...])` and
`assertAuthenticated(ctx)` from `packages/backend/convex/lib/utils.ts`.

Every public function MUST start with one of:

```typescript
import { assertAuthenticated, assertRole, assertAdmin } from "./lib/utils";

await assertAuthenticated(ctx);                              // any signed-in user
await assertRole(ctx, ["admin", "finance", "bursar"]);       // role list
await assertAdmin(ctx);                                       // admin-only shortcut
```

### Role codes currently used by `assertRole(...)` calls
`admin`, `finance`, `hod`, `dean`, `registrar`, `lecturer`,
`librarian`, `staff`. New codes (e.g. `bursar`, `cashier`,
`vice_chancellor`, `chaplain`) must be added to
`PROTECTED_ROLE_CODES` in `packages/backend/convex/roles.ts` and to
`ECU_DEFAULT_ROLES` before use.

---

## 6. Atomic Mutations for Multi-Table Writes

When a single business action must update multiple tables (e.g.
**record payment** → `transactions` + `studentLedger` +
`students.financeStatus`), wrap the writes in a single `internalMutation`
to guarantee all-or-nothing semantics:

```typescript
// packages/backend/convex/finance.ts (public action entrypoint)
export const recordPayment = action({
  args: { ... },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance", "cashier"]);
    const result = await ctx.runMutation(internal.finance._recordPayment, {
      ...args,
      recordedBy: await assertAuthenticated(ctx),
    });
    await ctx.runMutation(internal.system._logAction, { ... });
    return result;
  },
});

// Same file — internal mutation
export const _recordPayment = internalMutation({
  args: { ... },
  handler: async (ctx, args) => {
    // Insert transaction + update ledger + update student.financeStatus
    // all in one tx.
  },
});
```

Actions that wrap multiple separate public mutations are fragile and
forbidden — use `internalMutation` instead.

---

## 7. Fail-Fast with ConvexError

Never throw `new Error(...)` from a Convex function. Always use:

```typescript
import { ConvexError } from "convex/values";

throw new ConvexError({
  message: "Student record not found.",
  code: "NOT_FOUND",
  tip: "Verify the registration number and re-try.",
});
```

The UI can then `useQuery` error responses and render the structured
message + tip without string parsing.

---

## 8. Better Auth vs Main Database (CRITICAL)

This is **NOT** a multi-tenant pattern but is unique to this codebase
and must be respected:

```
┌─────────────────────────────────────────┐
│  Main Database (ctx.db)                 │
│  ✅ staffProfiles, students, faculties  │
│  ❌ user, session, account              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Component Storage (adapter API)        │
│  ✅ user, session, account, verification│
└─────────────────────────────────────────┘
```

Even though `schema.ts` spreads `...authTables`, the auth data lives
in the `components.betterAuth` component. For full details see
`.agents/workflows/better-auth-adapter-pattern.md`.

---

## 9. Backend Search (Full-Text)

For full-text search on `students`, `staffProfiles`, and `applicants`,
always define a `searchIndex` in `schema.ts` with the right
`filterFields` to keep filtering O(log N):

```typescript
students: defineTable({ ... })
  .searchIndex("search_students", {
    searchField: "registrationNumber",
    filterFields: ["programId", "yearOfStudy", "status"],
  });
```

Frontend rules:
- **Debounce** search inputs (300–400 ms) to avoid a query per keystroke.
- **Minimum length**: do not dispatch search for strings < 2 chars.
- **Bound results** to 50 items per query for latency.
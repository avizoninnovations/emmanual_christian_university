---
description: Standard boilerplate for high-performance data grids and infinite scrolling in the ECU portal.
---

# Workflow: Implementing Paginated Views (ECU)

This workflow provides the standardized boilerplate for implementing
high-performance data grids in the **Emmanuel Christian University**
portal. It leverages Convex's native pagination and the shared UI
primitives for infinite scrolling and state-aware loaders.

## When to use

Use this workflow for any list, table, or directory expected to grow
beyond 50 records. Mandatory for:

- Student ledger directory
- All transactions list
- Audit logs
- Staff directory
- Library loan history
- Course allocation overview
- Marks entry grid

## 1. Convex Query Implementation

Implement the query using `paginationOptsValidator` from
`convex/server`:

```typescript
// packages/backend/convex/finance.ts
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";

export const listTransactions = query({
  args: {
    paginationOpts: paginationOptsValidator,
    studentId: v.optional(v.id("students")),
    periodId: v.optional(v.id("academicPeriods")),
    type: v.optional(v.union(v.literal("payment"), v.literal("charge"), v.literal("waiver"))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance", "bursar"]);

    // Always index first, then paginate.
    let q = ctx.db.query("transactions").withIndex("by_date").order("desc");

    // ... apply filters via .filter((q) => q.eq(...)) AFTER withIndex,
    // OR better: add a compound index and filter on the index.

    return await q.paginate(args.paginationOpts);
  },
});
```

### Prefer compound indexes for multi-field filters
Add a matching compound index in `schema.ts` so the database can
filter on `studentId + periodId + type` at the index level instead
of scanning rows:

```typescript
transactions: defineTable({ ... })
  .index("by_date", ["date"])
  .index("by_student_period_type", ["studentId", "periodId", "type"])
```

## 2. Frontend Hook Integration

Use `usePaginatedQuery` from `convex/react` to manage cursors and
loading states:

```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

const { results, status, loadMore } = usePaginatedQuery(
  api.finance.listTransactions,
  { studentId, periodId, type },
  { initialNumItems: 25 }
);

// status values: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
```

## 3. The Professional Data Table

- Use the `Table` primitive from `@workspace/ui/components/table`.
- Wrap the view in a `Card` for containment.
- Show a `Skeleton` (or "Loading…") indicator when
  `status === "LoadingFirstPage"`.
- Use `font-mono` for registration numbers, receipt numbers, staffIds.
- Use `tabular-nums` for money columns to keep digits aligned.

## 4. Infinite Scroll Handshake

Use `InfiniteScrollTrigger` from
`@workspace/ui/components/infinite-scroll-trigger` to auto-load the
next page when the user scrolls to the bottom:

```tsx
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

<InfiniteScrollTrigger
  onInView={() => loadMore(25)}
  status={status}
/>
```

## 5. ECU Theme Handshake

- Table headers use `bg-muted/40`.
- Rows use `hover:bg-muted/50`.
- Action buttons in rows use `var(--primary)` (ECU Maroon) for the
  primary action, `variant="ghost"` for secondary.
- Keep the number of columns stable to prevent UI jumping during
  pagination.

## 6. Filters Above the Table

Place filter controls in a sticky header above the table:

```tsx
<Card className="mb-4 sticky top-0 z-10 bg-background/80 backdrop-blur">
  <CardContent className="flex flex-wrap items-center gap-3 p-4">
    <Select value={periodId} onValueChange={setPeriodId}>...</Select>
    <Select value={type} onValueChange={setType}>...</Select>
    <Input placeholder="Search by reg no..." value={search} onChange={...} />
  </CardContent>
</Card>
```

This keeps the data table below focused and the controls always
reachable.
---
description: Standard boilerplate for high-performance data grids and infinite scrolling.
---
# Workflow: Implementing Paginated Views
This workflow provides the standardized boilerplate for implementing high-performance data grids in the ECU portal. It leverages Convex's native pagination and the shared UI primitives for infinite scrolling and state-aware loaders.

## When to use
Use this workflow for any list, table, or directory expected to grow beyond 50 records. This is the mandatory standard for Student, Staff, Financial ledgers, and Audit logs.

## 1. Convex Query Implementation
Implement the query using the `paginationOpts` standard:
```typescript
export const listItems = query({
  args: { paginationOpts: v.paginationOpts() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("yourTable")
      .withIndex("by_some_index")
      .paginate(args.paginationOpts);
  },
});
```

## 2. Frontend Hook Integration
Use the `usePaginatedQuery` hook in your component:
```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

const { results, status, loadMore } = usePaginatedQuery(
  api.items.listItems,
  {},
  { initialNumItems: 10 }
);
```

## 3. The Professional Data Table
- Use the `Table` primitive from `@workspace/ui/components/table`.
- Wrap the view in a `Card` for containment.
- Use `Badge` for status columns.

## 4. Infinite Scroll Handshake
- At the bottom of the table body (or after the list), place the `InfiniteScrollTrigger` component:
```tsx
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

// ... inside the view JSX
<InfiniteScrollTrigger
  onInView={loadMore}
  status={status}
/>
```

## 5. Theme Handshake
- Ensure the table uses `bg-muted/40` for headers and `hover:bg-muted/50` for rows.
- Use `var(--primary)` for primary action buttons (e.g., "View Profile").

---
description: Standard boilerplate for high-performance data grids and infinite scrolling.
---
# Workflow: Implementing Paginated Views
This workflow provides the standardized boilerplate for implementing high-performance data grids in the ECU portal. It leverages Convex's native pagination and the shared UI primitives for infinite scrolling and state-aware loaders.

## When to use
Use this workflow for any list, table, or directory expected to grow beyond 50 records. This is the mandatory standard for Student, Staff, Financial ledgers, and Audit logs.

## 1. Convex Query Implementation
Implement the query using the `paginationOptsValidator` from `convex/server`:
```typescript
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";

export const listItems = query({
  args: { 
    paginationOpts: paginationOptsValidator,
    // Add additional filters here for backend filtering
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("yourTable")
      .order("desc") // Most recent first
      .paginate(args.paginationOpts);
  },
});
```

## 2. Frontend Hook Integration
Use the `usePaginatedQuery` hook in your component to manage cursors and loading states:
```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

const { results, status, loadMore } = usePaginatedQuery(
  api.items.listItems,
  {},
  { initialNumItems: 25 }
);

// status can be: "LoadingFirstPage", "CanLoadMore", "LoadingMore", "Exhausted"
```

## 3. The Professional Data Table
- Use the `Table` primitive from `@workspace/ui/components/table`.
- Wrap the view in a `Card` for containment.
- Show a `Loading...` indicator when `status === "LoadingFirstPage"`.

## 4. Infinite Scroll Handshake
- Use the `InfiniteScrollTrigger` component to automatically call `loadMore` when the user reaches the bottom.
```tsx
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

// ... inside the view JSX
<InfiniteScrollTrigger
  onInView={() => loadMore(25)}
  status={status}
/>
```

## 5. Theme Handshake
- Ensure the table headers use `bg-muted/40` and rows use `hover:bg-muted/50`.
- For specific actions in the table, use `var(--primary)` (Maroon) for consistency.
- Maintain a stable number of columns to prevent UI jumping during pagination.

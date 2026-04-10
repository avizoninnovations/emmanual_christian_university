---
description: The "Golden Template" for copy-pasting secure, audited, and O(1) mutations.
---
# Workflow: Implementing Secure Mutations

Use this "Golden Template" whenever an agent needs to create or update data. It ensures zero-trust security and atomic integrity.

## 1. The Secure Boilerplate
Every mission-critical mutation should look like this in `packages/backend/convex/`:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin } from "./lib/utils";
import { logAction } from "./audit_logger";

export const updateResource = mutation({
  args: {
    id: v.id("yourTable"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Mandatory Security Pass
    await assertAdmin(ctx);

    // 2. Data Validation & Logic
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError("Resource not found.");
    }

    // 3. The Write
    await ctx.db.patch(args.id, { status: args.status });

    // 4. Mandatory Audit Trail
    await logAction(ctx, {
      action: "UPDATE_RESOURCE",
      resource: "yourTable",
      details: `Updated status for ${args.id} to ${args.status}`,
    });

    return { success: true };
  },
});
```

## 2. Mandatory Guardrails
- **No Silent Fails**: Never return `null` or `{ error: "..." }` for permission or validation failures. Use `throw new ConvexError(...)`.
- **Atomic Writes**: If you need to update two tables, use an `internalMutation` to wrap both operations.
- **Index hits**: Ensure the verification step (`ctx.db.get` or `ctx.db.query().withIndex()`) is O(1) or O(log N).

## 3. When to use
This is the **standard** for any state change in the portals. It prevents unauthorized agents from modifying data if they bypass frontend protections.

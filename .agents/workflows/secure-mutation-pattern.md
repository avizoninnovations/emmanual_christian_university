---
description: The "Golden Template" for copy-pasting secure, audited, and O(log N) mutations in the ECU portal.
---

# Workflow: Implementing Secure Mutations (ECU)

Use this "Golden Template" whenever you create or update data in the
**Emmanuel Christian University** portal. It ensures zero-trust
security, atomic integrity, indexed reads, and mandatory audit
logging.

## 1. The Secure Boilerplate

Every mission-critical mutation should follow this template in
`packages/backend/convex/`:

```typescript
import { mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { assertRole, assertAuthenticated } from "./lib/utils";
import { logAction } from "./audit_logger";

// Public action entrypoint (when external coordination is needed)
export const voidReceipt = action({
  args: {
    transactionId: v.id("transactions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Mandatory Security Pass
    await assertRole(ctx, ["admin", "bursar", "finance"]);

    // 2. Coordinate via internal mutation
    const result = await ctx.runMutation(internal.finance._voidReceipt, {
      transactionId: args.transactionId,
      reason: args.reason,
      actorId: await assertAuthenticated(ctx),
    });

    // 3. Audit Trail (via internal helper for ctx.db-less actions)
    await ctx.runMutation(internal.system._logAction, {
      userId: result.actorId,
      userName: result.actorName,
      userEmail: result.actorEmail,
      action: "VOID_RECEIPT",
      resource: "transactions",
      details: `Voided receipt ${args.transactionId}. Reason: ${args.reason}`,
    });

    return result;
  },
});

// Internal mutation — atomic DB writes
export const _voidReceipt = internalMutation({
  args: {
    transactionId: v.id("transactions"),
    reason: v.string(),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch with index
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) {
      throw new ConvexError({
        message: "Transaction not found.",
        code: "NOT_FOUND",
      });
    }

    // 2. Reverse ledger update
    const ledger = await ctx.db
      .query("studentLedger")
      .withIndex("by_student_period", (q) =>
        q.eq("studentId", tx.studentId).eq("periodId", tx.periodId!)
      )
      .unique();
    if (ledger) {
      await ctx.db.patch(ledger._id, {
        totalPaid: Math.max(0, (ledger.totalPaid ?? 0) - tx.amount),
        // ... recompute balance + status
      });
    }

    // 3. Mark transaction as voided
    await ctx.db.patch(args.transactionId, {
      notes: `${tx.notes ?? ""}\n[VOIDED] ${args.reason}`,
    });

    return {
      actorId: args.actorId,
      actorName: "ADMIN",
      actorEmail: "admin@ecu-ssd.org",
    };
  },
});
```

For simple mutations that don't need an action wrapper, the
single-mutation form is fine:

```typescript
export const updateResource = mutation({
  args: {
    id: v.id("yourTable"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Mandatory Security Pass
    await assertRole(ctx, ["admin"]);

    // 2. Data Validation & Logic
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError({
        message: "Resource not found.",
        code: "NOT_FOUND",
      });
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

- **No Silent Fails** — Never return `null` or
  `{ error: "..." }` for permission or validation failures. Use
  `throw new ConvexError({ message, code, tip })`.
- **Atomic Writes** — If you need to update two tables, use an
  `internalMutation` to wrap both operations.
- **Indexed Reads** — Ensure the verification step
  (`ctx.db.get` or `ctx.db.query().withIndex(...)`) is O(1) or
  O(log N).
- **Always Audit** — Sensitive mutations (finance, user status,
  academic periods, role changes) MUST end with `logAction()`.
- **ConvexError Tip** — Provide a `tip` field so the UI can render
  actionable guidance without string parsing.

## 3. ECU Action vs Mutation Decision Tree

| Scenario | Use |
| --- | --- |
| Single-table update, no external calls | `mutation` |
| Multi-table update that must be atomic | `internalMutation` invoked by an `action` |
| Need to call m-Gurush / bank webhook / SMS | `action` → `runMutation(internal...)` |
| Need to revoke Better Auth sessions (ban/unban) | `action` → `runMutation(internal.users._patchAuthUserInternal, ...)` |
| Need to upload to cloud storage | `action` → `runMutation(internal.<x>._storeUrl, ...)` |
| Trigger Convex cron / scheduled function | `internalMutation` registered in `crons.ts` |

## 4. When to use

This is the **standard** for any state change in the ECU portals —
admin, student, finance, library, LMS, inventory. It prevents
unauthorized agents from modifying data if they bypass frontend
protections.
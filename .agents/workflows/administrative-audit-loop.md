---
description: Security standard for high-stakes system changes and administrative logging in the ECU portal.
---

# Workflow: Administrative Audit Loop (ECU)

This workflow establishes the security and logging standard for
high-stakes system changes in the **Emmanuel Christian University**
portal. It combines role-based access control with a mandatory audit
trail so every meaningful change is attributable.

## When to use

Use this workflow for any action that:

- Modifies user status (banning / unbanning staff, force logout).
- Touches financial records (recording payments, applying waivers,
  voiding receipts, adjusting fee structures, sponsor assignments).
- Mutates academic periods (advancing semester, rollover).
- Changes system configuration (school config, grading scales, role
  definitions).
- Edits student records (status changes — suspended, deferred,
  graduated, discontinued).

## 1. Trigger (Action Layer)

Administrative actions generally start as a Convex `action` in
`packages/backend/convex/`. This allows external coordination (e.g.
revoking Better Auth sessions, sending SMS notifications, calling
m-Gurush / bank webhooks).

```typescript
// packages/backend/convex/finance.ts
export const recordPayment = action({
  args: { studentId: v.id("students"), amount: v.number(), /* ... */ },
  handler: async (ctx, args) => {
    await assertRole(ctx, ["admin", "finance", "cashier"]);
    // ... orchestrate via runMutation(internal.finance._recordPayment, ...)
  },
});
```

## 2. Validation & Security

- Verify role against the `staffProfiles` record via
  `assertRole(ctx, [...])` from `packages/backend/convex/lib/utils.ts`.
- Verify the Better Auth session via `ctx.auth.getUserIdentity()`.

## 3. Data Mutation (Internal Only)

Perform the actual database write using an `internalMutation`. This
ensures database writes for sensitive fields cannot be triggered by
malicious clients directly.

```typescript
export const _recordPayment = internalMutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Insert transactions row
    // Update studentLedger
    // Update students.financeStatus
    // All in one atomic mutation.
  },
});
```

## 4. The Logging Handshake

Import `logAction` from `packages/backend/convex/audit_logger.ts`.

**Mandatory**: Every administrative mutation must conclude with an
`await logAction(ctx, { ... })`.

Parameters needed:
- `action` — e.g. `"RECORD_PAYMENT"`, `"APPLY_WAIVER"`, `"BAN_STAFF"`,
  `"ADVANCE_SEMESTER"`.
- `resource` — The affected table
  (`"transactions"`, `"feeStructures"`, `"users"`,
  `"academicPeriods"`).
- `details` — Human-readable description including the actor, target,
  amount, and receipt/ID number.

### Example
```typescript
await logAction(ctx, {
  action: "RECORD_PAYMENT",
  resource: "transactions",
  details: `Payment of 250,000 SSP recorded for ${student.registrationNumber} (Receipt: ${receiptNumber}, Channel: m-Gurush, Cashier: ${cashierName})`,
});
```

For actions (where `ctx.db` is unavailable), use the internal helper:

```typescript
await ctx.runMutation(internal.system._logAction, {
  userId: callerId,
  userName: callerName,
  userEmail: callerEmail,
  action: "BAN_STAFF",
  resource: "users",
  details: `Banned staff member ${userName} (ID: ${staffId}). Reason: ${reason}`,
});
```

## 5. Verification

- Verify the log entry has been created in the `auditLogs` table.
- Confirm `auditLogger.ts` indexes are present
  (`by_userId`, `by_action`, `by_createdAt`) so audit trails can be
  filtered efficiently.
- For any action that would appear in an audit trail for university
  management, this loop is mandatory.
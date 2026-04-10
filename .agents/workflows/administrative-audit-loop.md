---
description: Security standard for high-stakes system changes and administrative logging.
---
# Workflow: Administrative Audit Loop
This workflow establishes the security and logging standard for high-stakes system changes. It combines role-based access control with a mandatory audit trail to ensure accountability across the university portal.

## When to use
Use this workflow for any action that modifies user status (banning/unbanning), financial records, academic periods, or any system configurations that impact data integrity or regulatory compliance.

## 1. Trigger (Action Layer)
- Administrative actions should generally start as a Convex `action` in `packages/backend/convex/`.
- This allows for external coordination (like revoking Better Auth sessions or sending emails).

## 2. Validation & Security
- Ensure the user's role is verified against the `staffProfiles` record.
- Use `ctx.auth.getUserIdentity()` to verify the session.

## 3. Data Mutation (Internal Only)
- Perform the actual database write using an `internalMutation`.
- This ensures that database writes for sensitive fields cannot be triggered by malicious clients directly.

## 4. The Logging Handshake
- Import `logAction` from `packages/backend/convex/audit_logger.ts`.
- **Mandatory**: Every administrative mutation must conclude with an `await logAction(ctx, { ... })`.
- Parameters needed:
    - `action`: e.g. "BAN_STAFF", "UPDATE_FEE".
    - `resource`: The affected table (e.g. "users", "feeStructures").
    - `details`: Human-readable description of the change.

## 5. Verification
- Verify the log entry has been created in the `auditLogs` table.
- Use this loop for any action that would appear in an audit trail for university management.

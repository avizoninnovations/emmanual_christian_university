---
description: How to read, create, update, and delete Better Auth user records in this Convex project. CRITICAL: auth data lives in a component, NOT the main database.
---
# Workflow: Better Auth Adapter Pattern

Better Auth user records live in an **isolated Convex component** (`components.betterAuth`), NOT the main database. You **CANNOT** use `ctx.db.get()`, `ctx.db.patch()`, or `ctx.db.delete()` on auth records. You MUST use the component adapter API.

## 1. Key Architecture Rule

```
┌─────────────────────────────────────┐
│  Main Database (ctx.db)             │
│  ✅ staffProfiles, faculties, etc.  │
│  ❌ user, session, account          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Component Storage (adapter API)    │
│  ✅ user, session, account,         │
│     verification, jwks              │
└─────────────────────────────────────┘
```

Even though `schema.ts` spreads `...authTables`, the actual data is in the component. The spread is for type generation only.

## 2. Required Imports

```typescript
import { components } from "./_generated/api.js";
```

## 3. Reading Auth Records (findOne / findMany)

**CRITICAL**: `findOne` and `findMany` use **flat args** (NO `input` wrapper).

```typescript
// ✅ CORRECT — flat args
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: userId, operator: "eq" }],
});

// ✅ CORRECT — findMany, also flat
const allUsers = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  model: "user",
  paginationOpts: { cursor: null, numItems: 1000 },
});

// ❌ WRONG — do NOT wrap in `input`
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  input: { model: "user", where: [...] }  // WILL FAIL
});

// ❌ WRONG — do NOT use ctx.db
const user = await ctx.db.get(userId as any);  // WILL FAIL — "nonexistent document"
```

## 4. Updating Auth Records (updateOne)

**CRITICAL**: `updateOne` uses an **`input` wrapper** (different from reads).

```typescript
// ✅ CORRECT — wrapped in `input`
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
    update: { name: "New Name", email: "new@email.com" },
  },
});

// ❌ WRONG — flat args for updateOne
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  model: "user",  // WILL FAIL — "missing required field model"
  where: [...],
  update: { ... },
});

// ❌ WRONG — do NOT use ctx.db
await ctx.db.patch(userId as any, { name: "..." });  // WILL FAIL
```

## 5. Deleting Auth Records (deleteOne)

**CRITICAL**: `deleteOne` also uses an **`input` wrapper** (same as updateOne).

```typescript
// ✅ CORRECT — wrapped in `input`
await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
  },
});
```

## 6. Creating Auth Records

For creating users, use the Better Auth API instance directly (NOT the adapter):

```typescript
import { createAuth } from "./betterAuth/auth.js";

const auth = createAuth(ctx);

// ✅ CORRECT — use auth.api for account creation
const user = await auth.api.createUser({
  body: {
    email: "user@example.com",
    password: "SecurePassword!",
    name: "John Doe",
    role: "user",  // "user" or "admin" (Better Auth roles, NOT ECU roles)
    data: { emailVerified: true },
  },
});
```

## 7. API Shape Quick Reference

| Operation   | Function                          | Args Shape           |
|-------------|-----------------------------------|----------------------|
| `findOne`   | `adapter.findOne`   (runQuery)    | `{ model, where }`  |
| `findMany`  | `adapter.findMany`  (runQuery)    | `{ model, paginationOpts }` |
| `updateOne` | `adapter.updateOne` (runMutation) | `{ input: { model, where, update } }` |
| `deleteOne` | `adapter.deleteOne` (runMutation) | `{ input: { model, where } }` |
| `create`    | Use `auth.api` directly          | See Section 6        |

## 8. Coordinating Auth + Staff Profile Updates

When updating a user, you typically need to patch BOTH the auth record AND the `staffProfiles` record. Always do both in the same handler:

```typescript
// 1. Patch the staffProfile (main db)
await ctx.db.patch(profile._id, { roles, title, phone });

// 2. Patch the auth user (component storage)
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
    update: { name: fullName, email: newEmail },
  },
});
```

## 9. Environment Variables

Better Auth requires these in `packages/backend/.env.local`:

```
BETTER_AUTH_SECRET=<your-secret>
BETTER_AUTH_URL=http://localhost:3004
SITE_URL=http://localhost:3003
```

If the secret is missing, all auth operations will fail with `BetterAuthError: You are using the default secret`.

**Fallback**: The auth config in `convex/betterAuth/auth.ts` has a hardcoded fallback for local dev. For production, always set the env var.

## 10. Reference Implementation

See `packages/backend/convex/users.ts` for the canonical examples:
- `getCurrentUser` — reading auth users via `findMany`
- `updateStaffLogic` — coordinated auth + profile updates
- `deleteStaff` — deleting via component adapter
- `banStaff` / `unbanStaff` — updating ban fields via `_patchAuthUserInternal`

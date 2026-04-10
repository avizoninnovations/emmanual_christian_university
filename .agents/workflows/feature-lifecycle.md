---
description: Lifecycle for implementing new domain features from schema to UI.
---
# Workflow: Adding a New Feature
This workflow defines the end-to-end lifecycle for implementing a new domain feature in the ECU monorepo. It ensures that data remains performant (DSA), UI remains consistent with branding, and administrative actions are properly audited.

## When to use
Use this workflow whenever you are introducing a new table to the schema or adding a significant piece of functionality that spans the backend and frontend (e.g., adding a "Scholarships" or "Transcript" module).

## 1. Schema Definition (Convex)
- Locate `packages/backend/convex/schema.ts`.
- Define the new table with appropriate `v` types.
- **Mandatory**: Add indices for common lookup fields (IDs, statuses, dates).
- Example: `.index("by_student", ["studentId"])`.

## 2. Backend Implementation
- Create or update the service file in `packages/backend/convex/`.
- **Queries**: Implement `query({ ... })`. Use `withIndex()` and `paginate()`.
- **Mutations**: Implement `mutation({ ... })` for user actions.
- **Internal Workers**: Use `internalMutation` for background tasks (e.g. `audit_logger`).

## 3. Atomic UI Components
- Check `packages/ui/src/components` for existing primitives.
- If a new generic primitive is needed (e.g. a specialized date picker), build it there.
- Use Tailwind CSS variables (`--primary`, `--radius`) to ensure theme consistency.

## 4. Domain Module View
- Navigate to `apps/staff-portal/modules/`.
- Create or update the module directory (e.g. `modules/registration`).
- Build the "View" in `ui/views/feature-view.tsx`.
- Connect to the backend using `useQuery` or `useMutation` from `@workspace/backend/_generated/api`.

## 5. Security & Audit
- If the feature handles sensitive data (finance, user status), wrap the mutation in a `logAction()` call from `audit_logger.ts`.
- Ensure the view is placed under the correct role-protected route (e.g. `(admin)` or `(staff)`).

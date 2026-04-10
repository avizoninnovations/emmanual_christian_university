---
description: The official ECU monorepo standards for DSA, Auth, and professional Shadcn UI.
---
# Emmanuel Christian University - Code Style & Standards

This guide defines the "ECU Way" of building. It ensures high performance (DSA), security (Auth), and premium aesthetics (Theme) across the monorepo.

## 1. Architectural Philosophy
Our monorepo is divided into three distinct layers:
- **Portals (`apps/`)**: Thin, consumer-facing shells (Next.js). They handle routing and UI composition but delegating heavy logic to packages.
- **Core Packages (`packages/`)**:
    - `backend`: The source of truth (Convex). Contains all schema, business logic, and Better Auth component.
    - `ui`: The design system (Shadcn/Tailwind). Contains atomic primitives only.
- **Domain Modules**: Located within `apps/*/modules/`. Use domain-driven design to organize UI by feature (e.g., admissions, finance).

## 2. Convex & DSA Best Practices
Performance is not optional. Every query must follow these Data Structures and Algorithms principles:
- **Indexed-Only Reads**: Never use `.filter()` without first prefixing it with `.withIndex()`. Every lookup must be O(1) or O(log N).
- **Mandatory Pagination**: For any list expected to grow beyond 50 records, use `usePaginatedQuery` (frontend) and `paginate()` (backend).
- **Internal Security**: System-critical changes (logging, status updates) must be performed via `internalMutation` to ensure they can only be called from verified backend actions.

## 3. Identity & Better Auth Patterns
Better Auth is our identity provider, living in `packages/backend/convex/betterAuth`.
- **Identity Retrieval**: Use `createAuth(ctx)` in actions to perform administrative tasks (create users, ban, etc.).
- **Staff Profiles**: The `user` table is for identity; the `staffProfiles` table (linked via `userId`) is for domain data (roles, department, etc.).
- **Role Handshake**: Server-side role checks must always use the `roles` array from the `staffProfiles` record.

## 4. Professional UI & Theme Consistency
ECU interfaces must look and feel premium.
- **Atomic Composition**: Standard primitives come from `packages/ui`. Domain-specific UI is composed in `modules/*/ui`.
- **Theme Integrity**: Use OKLCH CSS variables for all styling. Never hardcode colors.
    - Brand: `var(--primary)` (ECU Maroon #800000).
    - Status: `var(--muted-foreground)`, `var(--secondary)`.
- **Typography & Motion**:
    - **SANS**: Inter (Standard UI).
    - **SERIF**: Source Serif 4 (Academic/Headings).
    - **MONO**: JetBrains Mono (Data/Reg Numbers).
- **Aesthetics**: Prioritize spacing (standardized gaps), subtle shadows (`var(--shadow-sm)`), and micro-animations for interactions.

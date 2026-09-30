---
name: convex-type-safety
description: >-
  Standardizes Convex API type safety, Convex search best practices, backend DSA patterns, preventing TS2589 deep union recursion errors, multi-tenant auth validation, and high-performance database indexing.
---

# Convex Type Safety, Search & Backend DSA Performance Standards

To guarantee strict TypeScript safety, high scalability, and $O(\log N)$ search/database query performance across **School Manager Uganda**, all Convex queries, mutations, and actions MUST adhere to these backend engineering and Data Structure & Algorithm (DSA) standards.

---

## 1. Preventing Convex TS2589 Recursion

### Problem
Passing client-side dynamic parameters into monolithic `api.path.to.function` query hooks can cause TypeScript to attempt infinite union resolution (`TS2589: Type instantiation is excessively deep and possibly infinite`).

### Solution
1. **Never use `api as any` or `: any`.**
2. **Always register typed function references in `@/core/api/`:**
   - `src/core/api/queryRefs.ts` for queries.
   - `src/core/api/mutationRefs.ts` for mutations.

### Example Function Registration

```typescript
// src/core/api/queryRefs.ts
import { makeFunctionReference } from "convex/server";
import { Doc, Id } from "@/convex/_generated/dataModel";

export const getStudentsQuery = makeFunctionReference<
  "query",
  { schoolId: Id<"schools">; classId?: Id<"classes"> },
  Doc<"students">[]
>("students:getStudents");
```

```typescript
// Usage in Custom Hook
import { useQuery } from "convex/react";
import { getStudentsQuery } from "@/core/api/queryRefs";

export function useStudents(schoolId: Id<"schools">, classId?: Id<"classes">) {
  const students = useQuery(getStudentsQuery, { schoolId, classId });
  return {
    students: students ?? [],
    isLoading: students === undefined,
  };
}
```

---

## 2. Convex Full-Text Search Best Practices

### Schema Definition (`convex/schema.ts`)
Always include multi-tenant filter fields (e.g., `schoolId`, `status`) in the search index definition so filtering occurs at the database index level ($O(\log N)$) rather than scanning documents in memory ($O(N)$).

```typescript
// convex/schema.ts
export default defineSchema({
  students: defineTable({
    schoolId: v.id("schools"),
    fullName: v.string(),
    lin: v.optional(v.string()),
    status: v.string(),
    // ...
  })
    .index("by_school", ["schoolId"])
    .index("by_school_status", ["schoolId", "status"])
    .searchIndex("search_students", {
      searchField: "fullName",
      filterFields: ["schoolId", "status"],
    }),
});
```

### Backend Search Function Implementation
```typescript
// convex/students.ts
export const searchStudents = query({
  args: {
    sessionId: v.id("sessions"),
    query: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);
    
    // Bounds check search query length to avoid empty scans
    if (!args.query || args.query.trim().length < 2) {
      return [];
    }

    return await ctx.db
      .query("students")
      .withSearchIndex("search_students", (q) => {
        let search = q.search("fullName", args.query).eq("schoolId", session.schoolId);
        if (args.status) {
          search = search.eq("status", args.status);
        }
        return search;
      })
      .take(50); // Bound result set for latency optimization
  },
});
```

### Frontend Search Best Practices
- **Debounce**: Always debounce search inputs (300–400ms) to avoid executing a Convex query on every keystroke.
- **Minimum Length**: Do not dispatch full-text search queries for strings with fewer than 2 characters.

---

## 3. Backend DSA & Database Scalability Rules

### Rule 1: Multi-Tenant Compound Indexing ($O(\log N)$ Complexity)
- ❌ **NEVER** write `ctx.db.query("table").collect()` followed by JS `.filter(r => r.schoolId === schoolId)`. This causes $O(N)$ full table scans that crash under heavy production loads.
- ✅ **ALWAYS** use indexed queries:
  ```typescript
  const classStudents = await ctx.db
    .query("students")
    .withIndex("by_school_class", (q) => 
      q.eq("schoolId", schoolId).eq("classId", classId)
    )
    .collect();
  ```

### Rule 2: Solve N+1 Query Problems with $O(1)$ Hash Maps
- ❌ **NEVER** execute Convex DB calls inside loops (`for (const item of list) await ctx.db.get(item.id)`). This results in $N$ sequential network roundtrips.
- ✅ **ALWAYS** batch fetch and build an $O(1)$ lookup Map:
  ```typescript
  // 1. Extract unique IDs (O(N))
  const uniqueClassIds = Array.from(new Set(students.map((s) => s.classId).filter(Boolean)));

  // 2. Parallel batch fetch (O(1) roundtrip)
  const classDocs = await Promise.all(uniqueClassIds.map((id) => ctx.db.get(id)));

  // 3. Create O(1) HashMap index
  const classMap = new Map(
    classDocs.filter(Boolean).map((cls) => [cls!._id.toString(), cls!])
  );

  // 4. Enrich students in O(N) linear time
  const enrichedStudents = students.map((s) => ({
    ...s,
    className: s.classId ? classMap.get(s.classId.toString())?.name ?? "Unassigned" : "Unassigned",
  }));
  ```

### Rule 3: Batch Processing & Mutation Chunking
- When executing heavy operations (bulk promotion, annual fee balance rollover, batch attendance creation), process records in chunks of 100–250 items to keep transaction execution time and memory well under Convex limits.

---

## 4. Multi-Tenant Authorization & Security Rules

In every Convex mutation or query:
1. **Always authenticate user**:
   ```typescript
   const identity = await ctx.auth.getUserIdentity();
   if (!identity) {
     throw new Error("Unauthenticated call");
   }
   ```
2. **Always enforce School Tenancy**:
   ```typescript
   // Ensure record belongs to caller's school
   if (record.schoolId !== schoolId) {
     throw new Error("Unauthorized tenant access");
   }
   ```

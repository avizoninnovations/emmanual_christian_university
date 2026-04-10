"use client";

import * as z from "zod";
import { Badge } from "@workspace/ui/components/badge";

// ─────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────

export const facultySchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  deanId: z.string().optional(),
  description: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  facultyId: z.string().min(1, "Faculty is required"),
  hodId: z.string().optional(),
  description: z.string().optional(),
});

export const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  departmentId: z.string().min(1, "Department is required"),
  level: z.enum(["Certificate", "Diploma", "Bachelor", "Master"]),
  durationYears: z.coerce.number().min(1).max(7),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "active"
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
          : "bg-muted text-muted-foreground"
      }
    >
      {status}
    </Badge>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const colours: Record<string, string> = {
    Bachelor: "bg-primary/10 text-primary border-primary/20",
    Diploma: "bg-amber-500/10 text-amber-600 border-amber-200",
    Certificate: "bg-blue-500/10 text-blue-600 border-blue-200",
    Master: "bg-purple-500/10 text-purple-600 border-purple-200",
  };
  return (
    <Badge variant="outline" className={colours[level] ?? ""}>
      {level}
    </Badge>
  );
}

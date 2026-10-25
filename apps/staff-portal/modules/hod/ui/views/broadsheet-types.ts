import type { FunctionReturnType } from "convex/server";
import { api } from "@workspace/backend/_generated/api";

export type BroadsheetData = NonNullable<
  FunctionReturnType<typeof api.broadsheet.getDepartmentBroadsheet>
>;
export type BroadsheetStudent = BroadsheetData["students"][number];
export type BroadsheetCourse = BroadsheetData["courses"][number];
export type BroadsheetProgram = BroadsheetData["program"];
export type BroadsheetPeriod = BroadsheetData["period"];
export type BroadsheetSummary = BroadsheetData["summary"];

export function decisionTone(type: BroadsheetStudent["decisionType"]): string {
  switch (type) {
    case "proceed":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "supplementary":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "probation":
    case "repeat":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}

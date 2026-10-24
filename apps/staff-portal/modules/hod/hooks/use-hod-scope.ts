"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";

export function useHodScope() {
  const context = useQuery(api.hod.context, {});
  const [department, setDepartment] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  const departmentId = context?.departments.find(item => item._id === department)?._id ?? context?.departments[0]?._id;
  const periodId = context?.periods.find(item => item._id === period)?._id
    ?? context?.periods.find(item => item.status === "active")?._id ?? context?.periods[0]?._id;
  return { context, departmentId, periodId, setDepartment, setPeriod };
}
export type HodScope = ReturnType<typeof useHodScope>;
export type ClassKey = { courseId: Id<"courses">; periodId: Id<"academicPeriods"> };

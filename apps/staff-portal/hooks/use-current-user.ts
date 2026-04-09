"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useCallback, useEffect, useState } from "react";

export type ActiveRole = "admin" | "staff";

export interface CurrentUser {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: number;
  roles: string[];
  title?: string;
  phone?: string;
  departmentId?: string;
  staffNumber?: string;
  profileStatus: string;
  profileId?: string;
}

const ACTIVE_ROLE_KEY = "ecu_active_role";

/**
 * Core hook for the role-based dashboard system.
 * Returns the current authenticated user with their roles,
 * and manages which dashboard role is currently active.
 */
export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser) as CurrentUser | null | undefined;
  const [activeRole, setActiveRoleState] = useState<ActiveRole | null>(null);

  // Load persisted role from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY) as ActiveRole | null;
      if (stored) {
        setActiveRoleState(stored);
      }
    }
  }, []);

  // Auto-select role if user only has one
  useEffect(() => {
    if (user && !activeRole) {
      const roles = user.roles || ["staff"];
      const hasAdmin = roles.includes("admin");
      const hasStaff = roles.some((r) => r !== "admin");

      if (hasAdmin && !hasStaff) {
        // Only admin role
        setActiveRole("admin");
      } else if (!hasAdmin && hasStaff) {
        // Only staff role(s), no admin
        setActiveRole("staff");
      }
      // If both admin and staff → don't auto-select, show role picker
    }
  }, [user, activeRole]);

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
    }
  }, []);

  const clearActiveRole = useCallback(() => {
    setActiveRoleState(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
    }
  }, []);

  const isLoading = user === undefined;
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isMultiRole = isAdmin && roles.some((r) => r !== "admin");
  const needsRoleSelection = !isLoading && user !== null && isMultiRole && !activeRole;

  return {
    user,
    roles,
    isAdmin,
    isLoading,
    activeRole,
    isMultiRole,
    needsRoleSelection,
    setActiveRole,
    clearActiveRole,
  };
}

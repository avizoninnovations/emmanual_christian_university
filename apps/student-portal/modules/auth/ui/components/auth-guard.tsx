"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "../layouts/auth-layout";
import { SignInView } from "../views/sign-in-view";

const StudentPortalRoleGuard = ({ children }: { children: React.ReactNode }) => {
  const user = useQuery(api.users.getCurrentUser);
  const router = useRouter();
  const clearingWrongPortalSession = useRef(false);
  const roles = user?.roles ?? [];
  const isStaffAccount = Boolean(roles.length && roles.every((role: string) => role !== "student"));
  const isUnassignedAccount = user !== undefined && (!user || roles.length === 0);

  useEffect(() => {
    if ((!isStaffAccount && !isUnassignedAccount) || clearingWrongPortalSession.current) return;
    clearingWrongPortalSession.current = true;
    toast.error(
      isStaffAccount
        ? "This is a staff account. Please sign in through the Staff Portal."
        : "This account is not linked to a student or staff profile. Contact the university ICT office.",
      { id: isStaffAccount ? "wrong-portal-staff-account" : "unassigned-portal-account" },
    );
    void authClient.signOut().catch(() => undefined).finally(() => router.replace("/sign-in"));
  }, [isStaffAccount, isUnassignedAccount, router]);

  if (user === undefined) {
    return <AuthLayout><p className="text-sm text-muted-foreground">Checking account access…</p></AuthLayout>;
  }

  if (isStaffAccount || isUnassignedAccount) {
    return <AuthLayout><SignInView /></AuthLayout>;
  }

  return <>{children}</>;
};

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLayout>
          <div aria-label="Checking session" aria-busy="true" className="w-full max-w-[600px] animate-pulse space-y-4 rounded-lg border border-border bg-card p-8">
            <div className="h-12 w-2/3 rounded bg-muted" />
            <div className="h-12 w-full rounded bg-muted" />
          </div>
        </AuthLayout>
      </AuthLoading>
      <Authenticated>
        <StudentPortalRoleGuard>{children}</StudentPortalRoleGuard>
      </Authenticated>
      <Unauthenticated>
        <AuthLayout>
          <SignInView />
        </AuthLayout>
      </Unauthenticated>
    </>
  );
};

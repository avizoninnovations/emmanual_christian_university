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
  const isStaffAccount = Boolean(user?.roles?.length && user.roles.every((role: string) => role !== "student"));

  useEffect(() => {
    if (!isStaffAccount || clearingWrongPortalSession.current) return;
    clearingWrongPortalSession.current = true;
    toast.error("This is a staff account. Please sign in through the Staff Portal.", { id: "wrong-portal-staff-account" });
    void authClient.signOut().catch(() => undefined).finally(() => router.replace("/sign-in"));
  }, [isStaffAccount, router]);

  if (user === undefined) {
    return <AuthLayout><p className="text-sm text-muted-foreground">Checking account access…</p></AuthLayout>;
  }

  if (isStaffAccount) {
    return <AuthLayout><SignInView /></AuthLayout>;
  }

  return <>{children}</>;
};

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLayout>
          <p>Loading...</p>
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

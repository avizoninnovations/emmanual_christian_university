"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";

export function GuestOnlyGuard({ children }: { children: React.ReactNode }) {
  return <>
    <AuthLoading>{children}</AuthLoading>
    <Authenticated><SignedInRedirect>{children}</SignedInRedirect></Authenticated>
    <Unauthenticated>{children}</Unauthenticated>
  </>;
}

function SignedInRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const redirecting = useRef(false);
  const roles = user?.roles ?? [];
  const isStudentOnly = Boolean(roles.length && roles.every((role: string) => role === "student"));
  const hasStaffRole = roles.some((role: string) => role !== "student");
  const isUnassignedAccount = user !== undefined && (!user || roles.length === 0);

  useEffect(() => {
    if (user === undefined || redirecting.current) return;
    if (isUnassignedAccount) {
      redirecting.current = true;
      toast.error("This account is not linked to a student or staff profile. Contact the university ICT office.", { id: "unassigned-portal-account" });
      void authClient.signOut().catch(() => undefined);
      return;
    }
    if (redirecting.current) return;
    redirecting.current = true;
    if (isStudentOnly) {
      toast.error("This is a student account. Please sign in through the Student Portal.", { id: "wrong-portal-student-account" });
      void authClient.signOut().catch(() => undefined);
      return;
    }
    if (hasStaffRole) router.replace("/");
  }, [hasStaffRole, isStudentOnly, isUnassignedAccount, router, user]);

  if (isStudentOnly || isUnassignedAccount || user === undefined) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

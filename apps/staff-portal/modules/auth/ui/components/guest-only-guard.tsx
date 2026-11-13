"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";

export function GuestOnlyGuard({ children }: { children: React.ReactNode }) {
  return <>
    <AuthLoading><SessionCheck /></AuthLoading>
    <Authenticated><SignedInRedirect>{children}</SignedInRedirect></Authenticated>
    <Unauthenticated>{children}</Unauthenticated>
  </>;
}

function SessionCheck() {
  return <p className="text-sm text-muted-foreground">Checking your session…</p>;
}

function SignedInRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const redirecting = useRef(false);
  const isStudentOnly = Boolean(user?.roles?.length && user.roles.every((role: string) => role === "student"));

  useEffect(() => {
    if (user === undefined || user === null) return;
    if (redirecting.current) return;
    redirecting.current = true;
    if (isStudentOnly) {
      toast.error("This is a student account. Please sign in through the Student Portal.", { id: "wrong-portal-student-account" });
      void authClient.signOut().catch(() => undefined);
      return;
    }
    router.replace("/");
  }, [isStudentOnly, router, user]);

  if (isStudentOnly) {
    return <>{children}</>;
  }

  return <SessionCheck />;
}

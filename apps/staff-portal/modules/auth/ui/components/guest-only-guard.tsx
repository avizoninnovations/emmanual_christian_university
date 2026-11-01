"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";

const STUDENT_PORTAL_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3005/"
  : "https://student-ecu.vercel.app/";

export function GuestOnlyGuard({ children }: { children: React.ReactNode }) {
  return <>
    <AuthLoading><SessionCheck /></AuthLoading>
    <Authenticated><SignedInRedirect /></Authenticated>
    <Unauthenticated>{children}</Unauthenticated>
  </>;
}

function SessionCheck() {
  return <p className="text-sm text-muted-foreground">Checking your session…</p>;
}

function SignedInRedirect() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const redirecting = useRef(false);
  const isStudentOnly = Boolean(user?.roles?.length && user.roles.every((role: string) => role === "student"));

  useEffect(() => {
    if (user === undefined || user === null) return;
    if (redirecting.current) return;
    redirecting.current = true;
    if (isStudentOnly) {
      void authClient.signOut().catch(() => undefined).finally(() => {
        window.location.replace(STUDENT_PORTAL_URL);
      });
      return;
    }
    router.replace("/");
  }, [isStudentOnly, router, user]);

  return <SessionCheck />;
}

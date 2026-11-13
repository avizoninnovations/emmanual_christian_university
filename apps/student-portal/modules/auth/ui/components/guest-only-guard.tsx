"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@workspace/backend/_generated/api";

const STAFF_PORTAL_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3004/"
  : "https://staff-main-ecu.vercel.app/";

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
  const isStaffAccount = Boolean(user?.roles?.length && user.roles.every((role: string) => role !== "student"));

  useEffect(() => {
    if (user === undefined || user === null) return;
    if (isStaffAccount) return;
    if (redirecting.current) return;
    redirecting.current = true;
    router.replace("/");
  }, [isStaffAccount, router, user]);

  if (isStaffAccount) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="text-xl font-semibold">This is a staff account</h1>
        <p className="text-sm text-muted-foreground">Please use the ECU Staff Portal to sign in with this account.</p>
        <a className="font-medium text-primary underline underline-offset-4" href={STAFF_PORTAL_URL}>Go to Staff Portal</a>
      </div>
    );
  }

  return <SessionCheck />;
}

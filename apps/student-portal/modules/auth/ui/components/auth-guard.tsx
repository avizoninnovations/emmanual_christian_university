"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { AuthLayout } from "../layouts/auth-layout";
import { SignInView } from "../views/sign-in-view";

const STAFF_PORTAL_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3004/"
  : "https://staff-main-ecu.vercel.app/";

const StudentPortalRoleGuard = ({ children }: { children: React.ReactNode }) => {
  const user = useQuery(api.users.getCurrentUser);
  const isStaffAccount = Boolean(user?.roles?.length && user.roles.every((role: string) => role !== "student"));

  if (user === undefined) {
    return <AuthLayout><p className="text-sm text-muted-foreground">Checking account access…</p></AuthLayout>;
  }

  if (isStaffAccount) {
    return (
      <AuthLayout>
        <div className="max-w-md space-y-3 px-5 text-center">
          <h1 className="text-xl font-semibold">This is a staff account</h1>
          <p className="text-sm text-muted-foreground">Please use the ECU Staff Portal to sign in with this account.</p>
          <a className="inline-flex font-medium text-primary underline underline-offset-4" href={STAFF_PORTAL_URL}>
            Continue to Staff Portal
          </a>
        </div>
      </AuthLayout>
    );
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

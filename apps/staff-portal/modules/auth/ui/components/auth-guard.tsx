"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { AuthLayout } from "../layouts/auth-layout";
import { SignInView } from "../views/sign-in-view";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Component, useEffect, type ReactNode } from "react";
import { AuthLoadingSkeleton } from "./auth-loading-skeleton";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";

type PortalErrorState = { error: Error | null };

class PortalQueryErrorBoundary extends Component<{ children: ReactNode }, PortalErrorState> {
  state: PortalErrorState = { error: null };

  static getDerivedStateFromError(error: Error): PortalErrorState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!isMissingStaffProfileError(error)) return;
    toast.error("This is a student account. Please sign in through the Student Portal.", { id: "wrong-portal-student-account" });
    void authClient.signOut().catch(() => undefined);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isStudentError = isMissingStaffProfileError(error);
    if (isStudentError) return <AuthLayout><SignInView /></AuthLayout>;

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">The staff portal could not load</h1>
          <p className="text-sm text-muted-foreground">Please return to sign-in and try again.</p>
          <a className="inline-flex font-medium text-primary underline underline-offset-4" href="/sign-in">
            Go to staff sign-in
          </a>
        </div>
      </main>
    );
  }
}

function isMissingStaffProfileError(error: Error) {
  return error.message.toLowerCase().includes("staff profile not found");
}

const LiveBanGuard = ({ children }: { children: React.ReactNode }) => {
  const user = useQuery(api.users.getCurrentUser);
  const router = useRouter();
  const clearingWrongPortalSession = useRef(false);
  const roles = user?.roles ?? [];
  const isStudentOnly = Boolean(roles.length && roles.every((role: string) => role === "student"));
  const isUnassignedAccount = user !== undefined && (!user || roles.length === 0);

  useEffect(() => {
    if (!user?.banned && user?.profileStatus !== "inactive") return;
    toast.error(user?.banned ? "Account suspended. Contact the university ICT office." : "Account inactive. Contact an administrator to restore access.", {
      id: user?.banned ? "staff-account-suspended" : "staff-account-inactive",
    });
    void authClient.signOut().catch(() => undefined).finally(() => router.replace("/sign-in"));
  }, [router, user]);

  useEffect(() => {
    if ((!isStudentOnly && !isUnassignedAccount) || clearingWrongPortalSession.current) return;
    clearingWrongPortalSession.current = true;
    toast.error(
      isStudentOnly
        ? "This is a student account. Please sign in through the Student Portal."
        : "This account is not linked to a student or staff profile. Contact the university ICT office.",
      { id: isStudentOnly ? "wrong-portal-student-account" : "unassigned-portal-account" },
    );
    void authClient.signOut().catch(() => undefined).finally(() => router.replace("/sign-in"));
  }, [isStudentOnly, isUnassignedAccount, router]);

  // Intercept render if they are strictly banned so they don't see brief protected UI flashes
  if (user?.banned || user?.profileStatus === "inactive") {
    return <AuthLayout><SignInView /></AuthLayout>;
  }

  if (user === undefined) return <AuthLoadingSkeleton />;

  if (isStudentOnly || isUnassignedAccount) {
    return <AuthLayout><SignInView /></AuthLayout>;
  }

  return <PortalQueryErrorBoundary>{children}</PortalQueryErrorBoundary>;
};

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <AuthLoading>
        <AuthLoadingSkeleton />
      </AuthLoading>
      <Authenticated>
        <LiveBanGuard>
          {children}
        </LiveBanGuard>
      </Authenticated>
      <Unauthenticated>
        <AuthLayout>
          <SignInView />
        </AuthLayout>
      </Unauthenticated>
    </>
  );
};

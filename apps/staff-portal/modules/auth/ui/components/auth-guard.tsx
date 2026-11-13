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
  const isStudentOnly = Boolean(user?.roles?.length && user.roles.every((role: string) => role === "student"));

  useEffect(() => {
    if (user?.banned || user?.profileStatus === "inactive") {
      // Force an immediate local log out and redirect with an error flag
      authClient.signOut().then(() => {
        const errorType = user.banned ? "banned" : "inactive";
        window.location.href = `/sign-in?error=${errorType}`;
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isStudentOnly || clearingWrongPortalSession.current) return;
    clearingWrongPortalSession.current = true;
    toast.error("This is a student account. Please sign in through the Student Portal.", { id: "wrong-portal-student-account" });
    void authClient.signOut().catch(() => undefined).finally(() => router.replace("/sign-in"));
  }, [isStudentOnly, router]);

  // Intercept render if they are strictly banned so they don't see brief protected UI flashes
  if (user?.banned || user?.profileStatus === "inactive") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative z-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-foreground font-semibold text-sm animate-pulse">Session invalidated. Logging out...</p>
        </div>
      </div>
    );
  }

  if (user === undefined) return <AuthLoadingSkeleton />;

  if (isStudentOnly) {
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

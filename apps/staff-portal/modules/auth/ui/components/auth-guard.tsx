"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { AuthLayout } from "../layouts/auth-layout";
import { SignInView } from "../views/sign-in-view";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";

const LiveBanGuard = ({ children }: { children: React.ReactNode }) => {
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user?.banned || user?.profileStatus === "inactive") {
      // Force an immediate local log out and redirect with an error flag
      authClient.signOut().then(() => {
        const errorType = user.banned ? "banned" : "inactive";
        window.location.href = `/sign-in?error=${errorType}`;
      });
    }
  }, [user]);

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

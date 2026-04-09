"use client"

import * as React from "react"
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider } from "next-themes";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in your .env file')
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export function Providers({ 
  children,
  initialToken,
}: { 
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConvexBetterAuthProvider client={convex} authClient={authClient} initialToken={initialToken}>
        {children}
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
};

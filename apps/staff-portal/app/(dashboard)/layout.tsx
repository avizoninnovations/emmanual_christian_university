"use client";

import { AuthGuard } from "@/modules/auth/ui/components/auth-guard";
import { Provider } from "jotai";

/**
 * Root Dashboard Layout.
 * Wraps the entire portal (admin, staff, and role selector)
 * with AuthGuard and Jotai Provider.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Provider>
        {children}
      </Provider>
    </AuthGuard>
  );
}

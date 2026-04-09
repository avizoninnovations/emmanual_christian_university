"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { ShieldOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";

/**
 * Route guard component for admin-only pages.
 * If the user's active role is not "admin", shows an access denied message.
 */
export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { activeRole, isLoading, isAdmin } = useCurrentUser();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  if (activeRole !== "admin" || !isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-destructive/10 border border-destructive/20">
            <ShieldOff className="size-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            This area is restricted to administrators. You don't have the required permissions to view this page.
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { ShieldOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";

interface AdminGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * Route guard component for admin and authorized role pages.
 * If allowedRoles is specified, checks if the user has any of those roles or is admin.
 * Otherwise, requires activeRole to be "admin".
 */
export const AdminGuard = ({ children, allowedRoles }: AdminGuardProps) => {
  const { roles, activeRole, isLoading, isAdmin } = useCurrentUser();
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

  const hasAccess = allowedRoles
    ? roles?.some((r) => allowedRoles.includes(r.toLowerCase())) || isAdmin
    : activeRole === "admin" && isAdmin;

  if (!hasAccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-destructive/10 border border-destructive/20">
            <ShieldOff className="size-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            This area is restricted. You don't have the required permissions to view this page.
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

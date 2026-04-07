"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleDispatcher() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user;

  // Track if we've already redirected
  const convexUser = useQuery(api.users.getAuthUser);

  useEffect(() => {
    if (session.isPending) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    if (convexUser) {
        if (convexUser.role === "Student") {
            router.push("/student/dashboard");
        } else {
            router.push("/staff/dashboard");
        }
    }
  }, [user, session.isPending, convexUser, router]);

  return (
    <div className="flex h-svh items-center justify-center p-8 text-center">
        <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground font-medium">Preparing your learning workspace...</p>
        </div>
    </div>
  )
}

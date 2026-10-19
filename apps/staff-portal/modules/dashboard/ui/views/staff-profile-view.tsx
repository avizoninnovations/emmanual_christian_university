"use client";

import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default function StaffProfileView() {
  const { user, roles, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-full bg-transparent p-4 md:p-6" role="status" aria-label="Loading profile">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-56" /></div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </CardHeader>
            <CardContent className="grid gap-6 border-t border-border/60 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 7 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-36" /></div>)}
            </CardContent>
          </Card>
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <p className="text-xs text-muted-foreground">Staff / Profile</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your staff account and contact details.</p>
        </header>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="size-7" /></span>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-lg">{user?.name ?? "ECU Staff"}</CardTitle>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email ?? "No email available"}</p>
            </div>
            <Badge variant="secondary" className="capitalize">{user?.profileStatus ?? "Active"}</Badge>
          </CardHeader>
          <CardContent className="grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Staff number" value={user?.staffNumber} icon={<ShieldCheck className="size-4" />} />
            <ProfileField label="Staff ID" value={user?.staffId} icon={<UserRound className="size-4" />} />
            <ProfileField label="Title" value={user?.title} />
            <ProfileField label="Email" value={user?.email} icon={<Mail className="size-4" />} />
            <ProfileField label="Phone" value={user?.phone} icon={<Phone className="size-4" />} />
            <ProfileField label="Roles" value={roles?.join(", ")} />
            <ProfileField label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileField({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 truncate text-sm font-medium">{icon}<span className="truncate">{value || "Not provided"}</span></p>
    </div>
  );
}

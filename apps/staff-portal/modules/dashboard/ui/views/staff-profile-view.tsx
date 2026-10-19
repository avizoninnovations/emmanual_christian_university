"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StaffProfileDetailsForm } from "../components/staff-profile-details-form";
import { StaffProfileEntryList } from "../components/staff-profile-entry-list";
import { StaffProfileAssetUpload } from "../components/staff-profile-asset-upload";
import { type EntrySection } from "../components/staff-profile-fields";

const tabs = [
  ["bio", "Bio-data"], ["residence", "Residence"], ["bank", "Bank & NSSF"],
  ["education", "Education & Experience"], ["affiliates", "Affiliate Persons"],
  ["academic", "Academic Profile"], ["employment", "Employment History"], ["documents", "Documents"],
] as const;

export default function StaffProfileView() {
  const { user, roles, isLoading: userLoading } = useCurrentUser();
  const result = useQuery(api.staffPersonalRecords.getMyProfile);
  const entryPage = usePaginatedQuery(api.staffPersonalRecords.getMyProfileEntries, {}, { initialNumItems: 50 });
  const saveDetails = useMutation(api.staffPersonalRecords.saveMyPersonalDetails);
  const [affiliate, setAffiliate] = useState<EntrySection>("nextOfKin");

  if (userLoading || result === undefined || entryPage.status === "LoadingFirstPage") return <ProfileSkeleton />;
  if (!user || !result) return <p className="p-6 text-sm text-muted-foreground">Staff profile could not be found.</p>;

  const details = result.profile.personalDetails ?? {};
  async function save(detailsToSave: Record<string, string>) {
    await saveDetails({ details: detailsToSave });
    toast.success("Staff profile updated");
  }

  return (
    <main className="min-h-full space-y-5 bg-transparent p-4 md:p-6">
      <header>
        <p className="text-xs text-muted-foreground">Staff / Personal Records</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and maintain your staff information.</p>
      </header>
      <StaffIdentity user={user} roles={roles} photoUrl={result.photoUrl} />
      <Tabs defaultValue="bio" className="min-w-0">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-background p-1 shadow-sm">
          {tabs.map(([value, label]) => <TabsTrigger key={value} value={value} className="h-10 shrink-0 px-3 text-xs uppercase md:text-sm">{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="bio" className="mt-4 space-y-4">
          <AccountSummary user={user} />
          <div className="grid gap-4 xl:grid-cols-2"><StaffProfileAssetUpload asset="photo" url={result.photoUrl} /><StaffProfileAssetUpload asset="signature" url={result.signatureUrl} /></div>
          <StaffProfileDetailsForm section="bioData" details={details} onSave={save} />
          <StaffProfileEntryList section="contact" entries={entryPage.results} />
        </TabsContent>
        <TabsContent value="residence" className="mt-4"><StaffProfileDetailsForm section="residence" details={details} onSave={save} /></TabsContent>
        <TabsContent value="bank" className="mt-4 space-y-4"><StaffProfileDetailsForm section="bank" details={details} onSave={save} /><StaffProfileEntryList section="bankAccount" entries={entryPage.results} /></TabsContent>
        <TabsContent value="education" className="mt-4 space-y-4">
          <StaffProfileEntryList section="qualification" entries={entryPage.results} />
          <StaffProfileEntryList section="experience" entries={entryPage.results} />
          <StaffProfileEntryList section="publication" entries={entryPage.results} />
        </TabsContent>
        <TabsContent value="affiliates" className="mt-4 space-y-4">
          <Tabs value={affiliate} onValueChange={(value) => setAffiliate(value as EntrySection)}>
            <TabsList className="h-auto flex-wrap"><AffiliateTrigger value="nextOfKin" label="Next of kin" /><AffiliateTrigger value="spouse" label="Spouse" /><AffiliateTrigger value="child" label="Children" /><AffiliateTrigger value="parent" label="Parents" /></TabsList>
            {(["nextOfKin", "spouse", "child", "parent"] as const).map((section) => <TabsContent key={section} value={section} className="mt-4"><StaffProfileEntryList section={section} entries={entryPage.results} /></TabsContent>)}
          </Tabs>
        </TabsContent>
        <TabsContent value="academic" className="mt-4"><StaffProfileDetailsForm section="academic" details={details} onSave={save} /></TabsContent>
        <TabsContent value="employment" className="mt-4 space-y-4"><EmploymentSummary user={user} profile={result.profile} /><StaffProfileEntryList section="employment" entries={entryPage.results} /></TabsContent>
        <TabsContent value="documents" className="mt-4"><StaffProfileEntryList section="document" entries={entryPage.results} /></TabsContent>
      </Tabs>
      {entryPage.status !== "Exhausted" && <div className="flex justify-center"><Button variant="outline" disabled={entryPage.status === "LoadingMore"} onClick={() => entryPage.loadMore(50)}>{entryPage.status === "LoadingMore" ? "Loading more records…" : "Load more profile records"}</Button></div>}
    </main>
  );
}

function AffiliateTrigger({ value, label }: { value: EntrySection; label: string }) {
  return <TabsTrigger value={value} className="capitalize">{label}</TabsTrigger>;
}

function StaffIdentity({ user, roles, photoUrl }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>; roles: string[]; photoUrl: string | null }) {
  return <Card className="border-0 shadow-sm"><CardContent className="flex flex-wrap items-center gap-4 p-5">
    <Avatar className="size-14 rounded-xl"><AvatarImage src={photoUrl ?? undefined} alt={`${user.name} profile`} /><AvatarFallback className="rounded-xl bg-primary/10 text-lg font-semibold text-primary">{initials(user.name)}</AvatarFallback></Avatar>
    <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold">{user.name}</h2><p className="truncate text-sm text-muted-foreground">{user.email}</p></div>
    <Badge variant="secondary" className="capitalize">{user.profileStatus}</Badge>
    {roles.map((role) => <Badge key={role} variant="outline" className="capitalize">{role}</Badge>)}
  </CardContent></Card>;
}

function AccountSummary({ user }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]> }) {
  return <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <ReadOnlyField label="Username" value={user.email.split("@")[0]} /><ReadOnlyField label="Login email" value={user.email} /><ReadOnlyField label="University ID number" value={user.staffId} /><ReadOnlyField label="Staff number" value={user.staffNumber} />
  </CardContent></Card>;
}

function EmploymentSummary({ user, profile }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>; profile: Doc<"staffProfiles"> }) {
  return <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Employment history</CardTitle></CardHeader><CardContent>
    <p className="mb-4 text-sm text-muted-foreground">Current appointment and employment dates.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label="Staff ID" value={user.staffId} /><ReadOnlyField label="Position" value={profile.title} /><ReadOnlyField label="Department" value={profile.departmentId} /><ReadOnlyField label="Division" value={profile.divisionName} /><ReadOnlyField label="Job type" value={profile.jobType} /><ReadOnlyField label="Supervisor profile ID" value={profile.supervisorProfileId} /><ReadOnlyField label="Start date" value={profile.employmentStartDate} /><ReadOnlyField label="End date" value={profile.employmentEndDate} /><ReadOnlyField label="Employment status" value={user.profileStatus} /></div>
  </CardContent></Card>;
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg bg-muted/35 p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</p></div>;
}

function ProfileSkeleton() {
  return <div className="space-y-5 p-4 md:p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-11 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EC";
}

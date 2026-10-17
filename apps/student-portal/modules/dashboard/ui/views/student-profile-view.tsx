"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Loader2, Mail, GraduationCap, Layers3, Building2, BookOpen, UserRound } from "lucide-react";

type ProfileFieldProps = { label: string; value: string; icon?: React.ComponentType<{ className?: string }> };

function ProfileField({ label, value, icon: Icon }: ProfileFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span className="break-words">{value || "Not provided"}</span>
      </p>
    </div>
  );
}

export function StudentProfileView() {
  const profile = useQuery(api.student_portal.getMyProfile);

  if (profile === undefined) {
    return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return <div className="p-8 text-sm text-muted-foreground">Student profile is not available.</div>;
  }

  const academicTerm = profile.currentPeriod
    ? `Year ${profile.yearOfStudy} · Semester ${profile.currentPeriod.term}`
    : `Year ${profile.yearOfStudy} · Semester ${profile.semester}`;

  return (
    <div className="w-full space-y-4 p-5 sm:p-6 lg:p-8">
      <section className="relative flex min-h-44 flex-col justify-center gap-5 overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary/85 to-primary/65 p-6 text-primary-foreground shadow-sm sm:flex-row sm:items-center sm:px-8">
        <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-4 border-background/80 bg-background/15 text-4xl font-semibold uppercase">
          {profile.name.trim().charAt(0) || <UserRound className="size-10" />}
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.name}</h1>
          <p className="font-semibold">{profile.program.name}</p>
          <p className="font-mono text-sm text-primary-foreground/85">{profile.registrationNumber}</p>
        </div>
        <Badge variant="secondary" className="absolute right-5 top-5 capitalize">{profile.status}</Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Academic summary">
        <SummaryCard icon={GraduationCap} label="Current year" value={String(profile.yearOfStudy)} />
        <SummaryCard icon={Layers3} label="Current semester" value={String(profile.currentPeriod?.term ?? profile.semester)} />
        <SummaryCard icon={Building2} label="Department" value={profile.department.name} />
        <SummaryCard icon={BookOpen} label="Programme" value={profile.program.code} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ProfileCard title="Basic Information">
          <ProfileField label="Full name" value={profile.name} />
          <ProfileField label="Registration number" value={profile.registrationNumber} />
          <ProfileField label="Email" value={profile.email} icon={Mail} />
        </ProfileCard>
        <ProfileCard title="Academic Information">
          <ProfileField label="Student status" value={profile.status} />
          <ProfileField label="Programme" value={profile.program.name} />
          <ProfileField label="Programme code" value={profile.program.code} />
          <ProfileField label="Department" value={profile.department.name} />
          <ProfileField label="Year and semester" value={academicTerm} />
          <ProfileField label="Academic period" value={profile.currentPeriod?.name ?? "Not available"} />
        </ProfileCard>
        <ProfileCard title="Contact Information">
          <ProfileField label="Email address" value={profile.email} icon={Mail} />
          <p className="text-sm text-muted-foreground">Additional contact details have not been added to your student profile.</p>
        </ProfileCard>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: ProfileFieldProps["icon"]; label: string; value: string }) {
  if (!Icon) return null;
  return (
    <Card className="relative min-w-0 overflow-hidden border-0 shadow-sm">
      <div className="absolute inset-y-3 left-0 w-1 rounded-r bg-primary" />
      <CardContent className="flex min-h-20 items-center gap-3 p-4 pl-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate text-sm font-semibold" title={value}>{value}</p></div>
      </CardContent>
    </Card>
  );
}

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="min-h-72 shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-x-5 gap-y-6 p-5 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Loader2, Mail, GraduationCap, Layers3, Building2, BookOpen, Phone, MapPin, HeartPulse } from "lucide-react";
import { StudentIdentityBanner } from "../components/student-identity-banner";

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

  const birthDate = profile.dateOfBirth ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${profile.dateOfBirth}T00:00:00Z`)) : "—";
  const emergencyContact = profile.emergencyContact
    ? `${profile.emergencyContact.name} · ${profile.emergencyContact.phone}` : "—";

  return (
    <div className="w-full space-y-4 p-5 sm:p-6 lg:p-8">
      <StudentIdentityBanner
        name={profile.name}
        program={profile.program.name}
        email={profile.email}
        phone={profile.phone}
        nationality={profile.nationality}
        imageUrl={profile.imageUrl}
        status={profile.onSemester ? "On Semester" : "Off Semester"}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Academic summary">
        <SummaryCard icon={GraduationCap} label="Current year" value={String(profile.yearOfStudy)} />
        <SummaryCard icon={Layers3} label="Current semester" value={String(profile.currentPeriod?.term ?? profile.semester)} />
        <SummaryCard icon={Building2} label="Study mode" value={profile.programType || "—"} />
        <SummaryCard icon={BookOpen} label="Faculty" value={profile.faculty.name} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ProfileCard title="Basic Info">
          <ProfileField label="First name" value={profile.firstName || profile.name} />
          <ProfileField label="Surname" value={profile.surname} />
          <ProfileField label="Other name" value={profile.otherName || "—"} />
          <ProfileField label="Gender" value={profile.gender.replaceAll("_", " ").toUpperCase()} />
          <ProfileField label="Date of birth" value={birthDate} />
          <ProfileField label="Nationality" value={profile.nationality} />
        </ProfileCard>
        <ProfileCard title="Academic Info">
          <ProfileField label="Student number" value={profile.registrationNumber} />
          <ProfileField label="Access number" value={profile.accessNumber} />
          <ProfileField label="Year of entry" value={profile.yearOfEntry ? String(profile.yearOfEntry) : "—"} />
          <ProfileField label="Faculty" value={profile.faculty.name} />
          <div className="sm:col-span-2"><ProfileField label="Program" value={profile.program.name} /></div>
          <ProfileField label="Program type" value={profile.programType} />
        </ProfileCard>
        <ProfileCard title="Contact Info">
          <div className="sm:col-span-2"><ProfileField label="Email" value={profile.email} icon={Mail} /></div>
          <div className="sm:col-span-2"><ProfileField label="Phone" value={profile.phone} icon={Phone} /></div>
          <div className="sm:col-span-2"><ProfileField label="Emergency contact" value={emergencyContact} icon={HeartPulse} /></div>
          <div className="sm:col-span-2"><ProfileField label="Address" value={profile.address} icon={MapPin} /></div>
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

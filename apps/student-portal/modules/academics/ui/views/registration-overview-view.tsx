"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Utensils, House, GraduationCap, Wallet, Loader2 } from "lucide-react";
import { CourseRegistrationView } from "./course-registration-view";
import { StudentIdentityBanner } from "../../../dashboard/ui/components/student-identity-banner";

export function RegistrationOverviewView() {
  const profile = useQuery(api.student_portal.getMyProfile);
  if (profile === undefined) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (!profile) return <p className="p-8 text-muted-foreground">Your student profile is not available. Contact the Academic Registrar.</p>;
  if (!profile.registration || profile.registration.status !== "registered") return <CourseRegistrationView />;
  const registration = profile.registration;
  const paidPercent = profile.financial.totalBilled > 0 ? Math.min(100, Math.round(profile.financial.totalPaid / profile.financial.totalBilled * 100)) : 0;
  const registeredDate = registration.registeredAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(registration.registeredAt) : "Pending";
  return <div className="space-y-5 p-5 sm:p-6 lg:p-8">
    <StudentIdentityBanner
      name={profile.name}
      program={profile.program.name}
      email={profile.email}
      phone={profile.phone}
      nationality={profile.nationality}
      imageUrl={profile.imageUrl}
      status="On Semester"
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[ ["Access no.", profile.accessNumber || "—"], ["Reg. number", profile.registrationNumber], ["Year", String(registration.yearOfStudy)], ["Semester", String(registration.semester)] ].map(([label, value]) => <Card key={label} className="shadow-sm"><CardContent className="p-5"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-2 break-words text-lg font-semibold">{value}</p></CardContent></Card>)}
    </div>
    <Card className="shadow-sm"><CardContent className="p-6">
      <h2 className="mb-6 text-xs font-bold tracking-wide">CLEARANCE TIMELINE</h2>
      <ol className="space-y-8 border-l-2 border-primary/20 pl-6">
        <li className="relative"><Utensils className="absolute -left-9 top-0 size-6 rounded-full bg-background p-1 text-primary" /><p className="text-xs text-muted-foreground">{registration.cafeteriaStatus || "Not recorded"}</p><h3 className="font-semibold">CAFETERIA</h3><p className="mt-2 text-sm text-muted-foreground">{registration.mealPlan || "No meal"}</p></li>
        <li className="relative"><House className="absolute -left-9 top-0 size-6 rounded-full bg-background p-1 text-primary" /><p className="text-xs text-muted-foreground">{registration.residenceStatus || "Not recorded"}</p><h3 className="font-semibold">ACCOMMODATION</h3><dl className="mt-3 grid max-w-xl grid-cols-2 gap-4 text-sm sm:grid-cols-5">{[["Type", registration.accommodationType], ["Hall", registration.hall], ["Block", registration.block], ["Room", registration.room], ["Bed", registration.bed]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value || "None"}</dd></div>)}</dl></li>
        <li className="relative"><GraduationCap className="absolute -left-9 top-0 size-6 rounded-full bg-background p-1 text-primary" /><p className="text-xs text-muted-foreground">{registeredDate}</p><h3 className="font-semibold">ACADEMICS</h3><p className="mt-2 text-sm text-muted-foreground">Registered by: {registration.registeredBy || "Not recorded"}</p></li>
        <li className="relative"><Wallet className="absolute -left-9 top-0 size-6 rounded-full bg-background p-1 text-primary" /><Button asChild variant="outline" size="sm" className="mb-3"><Link href="/finance">View statement</Link></Button><h3 className="font-semibold">ACCOUNTS</h3><p className="mt-2 text-sm text-muted-foreground">Cleared by: {registration.accountsClearedBy || "Awaiting accounts clearance"}</p><p className="text-sm font-semibold">Tuition: {paidPercent}%</p></li>
      </ol>
    </CardContent></Card>
  </div>;
}

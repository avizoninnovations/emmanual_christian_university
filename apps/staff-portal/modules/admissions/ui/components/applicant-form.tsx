"use client";

import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@workspace/ui/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useApplicantForm } from "../../hooks/use-applicant-form";
import type { ApplicantFormValues } from "../../schemas/applicant-schema";

const sections = [
  { title: "Personal details", fields: [
    { name: "firstName", label: "First name" }, { name: "surname", label: "Surname" },
    { name: "otherName", label: "Other name" }, { name: "dateOfBirth", label: "Date of birth", type: "date" },
    { name: "nationality", label: "Nationality" },
  ] },
  { title: "Contact details", fields: [
    { name: "email", label: "Email address", type: "email" }, { name: "phone", label: "Phone number", type: "tel" },
    { name: "address", label: "Residential address" },
  ] },
  { title: "Emergency contact", fields: [
    { name: "emergencyName", label: "Contact name" }, { name: "emergencyRelationship", label: "Relationship" },
    { name: "emergencyPhone", label: "Contact phone", type: "tel" }, { name: "emergencyEmail", label: "Contact email", type: "email" },
  ] },
] satisfies { title: string; fields: { name: keyof ApplicantFormValues; label: string; type?: string }[] }[];

export function ApplicantForm({ onBack }: { onBack: () => void }) {
  const { form, programs, submit, activePeriod } = useApplicantForm(onBack);
  return (
    <Card className="mt-4 shadow-sm">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} aria-label="Back to applications"><ArrowLeft className="size-5" /></Button>
          <h2 className="text-2xl font-bold">New Application</h2>
        </div>
        <Form {...form}>
          <form onSubmit={submit} className="max-w-4xl space-y-8">
            {sections.map(section => <section key={section.title} className="space-y-4">
              <h3 className="border-b pb-2 text-base font-semibold">{section.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map(item => <FormField key={item.name} control={form.control} name={item.name} render={({ field }) => (
                  <FormItem><FormLabel>{item.label}</FormLabel><FormControl><Input {...field} type={"type" in item ? item.type : "text"} /></FormControl><FormMessage /></FormItem>
                )} />)}
                {section.title === "Personal details" && <FormField control={form.control} name="gender" render={({ field }) => <FormItem>
                  <FormLabel>Gender</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem><SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent></Select><FormMessage />
                </FormItem>} />}
              </div>
            </section>)}
            <section className="space-y-4">
              <h3 className="border-b pb-2 text-base font-semibold">Academic details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="programId" render={({ field }) => <FormItem>
                  <FormLabel>Program</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger></FormControl><SelectContent>
                    {programs.map(program => <SelectItem key={program._id} value={program._id}>{program.name}</SelectItem>)}
                  </SelectContent></Select><FormMessage />
                </FormItem>} />
                <FormField control={form.control} name="yearOfEntry" render={({ field }) => <FormItem><FormLabel>Year of entry</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="programType" render={({ field }) => <FormItem>
                  <FormLabel>Program type</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                    {["Day", "Evening", "Weekend", "Distance"].map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                  </SelectContent></Select><FormMessage />
                </FormItem>} />
                <FormField control={form.control} name="admissionType" render={({ field }) => <FormItem>
                  <FormLabel>Admission route</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="National">National</SelectItem><SelectItem value="Direct">Direct / International</SelectItem>
                  </SelectContent></Select><FormMessage />
                </FormItem>} />
              </div>
            </section>
            {!activePeriod && <p className="text-sm text-muted-foreground">An active academic period is required before submitting.</p>}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="ghost" onClick={onBack}>Cancel</Button>
              <Button type="submit" aria-busy={form.formState.isSubmitting} disabled={!activePeriod || form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Submit Application</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { profileFields, type StaffProfileSection } from "./staff-profile-fields";

interface StaffProfileDetailsFormProps {
  section: StaffProfileSection;
  details: Record<string, string>;
  onSave: (details: Record<string, string>) => Promise<void>;
}

export function StaffProfileDetailsForm({ section, details, onSave }: StaffProfileDetailsFormProps) {
  const fields = profileFields[section];
  const schema = z.record(z.string(), z.string().max(5000, "Keep each field under 5,000 characters."));
  const defaultValues = fields.reduce<Record<string, string>>((values, field) => {
    values[field.key] = details[field.key] ?? "";
    return values;
  }, {});
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues });

  useEffect(() => form.reset(defaultValues), [details]);

  async function submit(values: Record<string, string>) {
    try {
      await onSave({ ...details, ...values });
    } catch {
      form.setError("root", { message: "Your changes could not be saved. Please try again." });
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader><CardTitle className="text-base">{sectionTitle(section)}</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => <FormField key={field.key} control={form.control} name={field.key} render={({ field: input }) => <FormItem className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              {field.type === "checkbox" ? <FormLabel className="flex min-h-10 items-center gap-3 rounded-lg bg-muted/40 px-3 text-sm font-medium"><FormControl><Checkbox checked={input.value === "true"} onCheckedChange={(checked) => input.onChange(String(checked === true))} /></FormControl>{field.label}</FormLabel> : <><FormLabel>{field.label}</FormLabel><FormControl>{field.type === "textarea" ? <Textarea {...input} className="min-h-28" /> : <Input {...input} type={field.type ?? "text"} />}</FormControl></>}
              <FormMessage />
            </FormItem>} />)}
          </div>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
          <div className="flex justify-end border-t border-border pt-4"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save changes"}</Button></div>
        </form></Form>
      </CardContent>
    </Card>
  );
}

function sectionTitle(section: StaffProfileSection) {
  return { bioData: "View & edit bio-data", residence: "View & edit residence details", bank: "Bank & NSSF details", academic: "Manage academic profile" }[section];
}

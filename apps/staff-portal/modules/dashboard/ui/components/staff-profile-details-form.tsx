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
  const fieldGroups = Array.from(new Set(fields.map((field) => field.group))).map((group) => ({
    group,
    fields: fields.filter((field) => field.group === group),
  }));
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
    <Card className="rounded-2xl border-0 bg-card/80 shadow-sm">
      <CardHeader className="px-5 pb-2 pt-5"><CardTitle className="text-base">{sectionTitle(section)}</CardTitle><p className="text-sm text-muted-foreground">Keep these details accurate for your staff record.</p></CardHeader>
      <CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <div className="space-y-7">
            {fieldGroups.map(({ group, fields: groupFields }) => <section key={group} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight">{group}</h3>
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                {groupFields.map((field) => <FormField key={field.key} control={form.control} name={field.key} render={({ field: input }) => <FormItem className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  {field.type === "checkbox" ? <FormLabel className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/40 px-3 text-sm font-medium transition-colors hover:bg-muted/60"><FormControl><Checkbox checked={input.value === "true"} onCheckedChange={(checked) => input.onChange(String(checked === true))} /></FormControl>{field.label}</FormLabel> : <><FormLabel className="text-xs font-medium text-muted-foreground">{field.label}</FormLabel><FormControl>{field.type === "textarea" ? <Textarea {...input} className="min-h-28 resize-y border-transparent bg-muted/35 shadow-none transition-colors focus-visible:border-primary/30 focus-visible:bg-background" /> : <Input {...input} type={field.type ?? "text"} className="border-transparent bg-muted/35 shadow-none transition-colors focus-visible:border-primary/30 focus-visible:bg-background" />}</FormControl></>}
                  <FormMessage />
                </FormItem>} />)}
              </div>
            </section>)}
          </div>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
          <div className="flex justify-end pt-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save changes"}</Button></div>
        </form></Form>
      </CardContent>
    </Card>
  );
}

function sectionTitle(section: StaffProfileSection) {
  return { bioData: "View & edit bio-data", residence: "View & edit residence details", bank: "Bank & NSSF details", academic: "Manage academic profile" }[section];
}

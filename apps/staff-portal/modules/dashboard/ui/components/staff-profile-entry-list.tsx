"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Sheet, WideSheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { entrySections, type EntrySection } from "./staff-profile-fields";

interface StaffProfileEntryListProps {
  section: EntrySection;
  entries: ProfileEntry[];
}

type ProfileEntry = Doc<"staffProfileEntries"> & { fileUrl: string | null };

export function StaffProfileEntryList({ section, entries }: StaffProfileEntryListProps) {
  const [editing, setEditing] = useState<ProfileEntry | null | "new">(null);
  const definition = entrySections[section];
  const saveEntry = useMutation(api.staffPersonalRecords.saveMyProfileEntry);
  const deleteEntry = useMutation(api.staffPersonalRecords.deleteMyProfileEntry);
  const generateUploadUrl = useMutation(api.staffPersonalRecords.generateMyProfileUploadUrl);
  const sectionEntries = entries.filter((entry) => entry.section === section);

  async function save(form: FormData) {
    const data = definition.fields.reduce<Record<string, string>>((values, label) => {
      values[fieldKey(label)] = String(form.get(fieldKey(label)) ?? "").trim();
      return values;
    }, {});
    const title = data[fieldKey(definition.fields[0])] || definition.title;
    const entry = editing && editing !== "new" ? editing : null;
    try {
      const file = form.get("profileFile");
      let fileId: Id<"_storage"> | undefined;
      if (entry?.fileId) data.fileName = entry.data.fileName ?? "";
      if ((section === "document" || section === "qualification") && file instanceof File && file.size > 0) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Files must be 10 MB or smaller.");
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!response.ok) throw new Error("The file could not be uploaded.");
        const result: unknown = await response.json();
        if (typeof result !== "object" || result === null || !("storageId" in result) || typeof result.storageId !== "string") throw new Error("The file upload returned an invalid response.");
        fileId = result.storageId as Id<"_storage">;
        data.fileName = file.name;
      }
      await saveEntry({ entryId: entry?._id, section, title, data, ...(fileId ? { fileId } : {}) });
      setEditing(null);
      toast.success(`${definition.title} saved`);
    } catch {
      toast.error("Could not save this profile record");
    }
  }

  async function remove(entryId: Doc<"staffProfileEntries">["_id"]) {
    await deleteEntry({ entryId });
    toast.success("Profile record removed");
  }

  return (
    <Card className="rounded-2xl border-0 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5">
        <div><CardTitle className="text-base">{definition.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Keep your {definition.title.toLowerCase()} up to date.</p></div>
        <Button size="sm" className="rounded-lg" onClick={() => setEditing("new")}><Plus className="mr-1 size-4" />Add</Button>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {sectionEntries.length === 0 ? <div className="rounded-xl bg-muted/35 px-4 py-8 text-center"><p className="text-sm font-medium">Nothing added yet</p><p className="mt-1 text-sm text-muted-foreground">Add {definition.title.toLowerCase()} to complete your staff profile.</p></div> : (
          <div className="divide-y divide-border/50">
            {sectionEntries.map((entry) => (
              <article key={entry._id} className="group flex items-start justify-between gap-3 rounded-xl px-2 py-4 transition-colors hover:bg-muted/30 sm:px-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{entry.title || definition.title}</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {definition.fields.slice(1).map((label) => <div key={label} className="min-w-0"><dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words text-sm">{entry.data[fieldKey(label)] || legacyQualificationValue(entry, label) || <span className="text-muted-foreground">Not provided</span>}</dd></div>)}
                  </dl>
                  {entry.data.fileName && <p className="mt-3 text-xs text-muted-foreground">File: {entry.data.fileName}</p>}
                  {entry.fileUrl && <a href={entry.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4">View attached file</a>}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${definition.title}`} onClick={() => setEditing(entry)}><Pencil className="size-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Delete ${definition.title}`}><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Remove this record?</AlertDialogTitle><AlertDialogDescription>This removes the selected entry from your staff profile.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void remove(entry._id)}>Remove</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
      <EntryEditor section={section} record={editing} onClose={() => setEditing(null)} onSave={save} />
    </Card>
  );
}

function EntryEditor({ section, record, onClose, onSave }: { section: EntrySection; record: ProfileEntry | null | "new"; onClose: () => void; onSave: (form: FormData) => Promise<void> }) {
  const definition = entrySections[section];
  const fileInput = useRef<HTMLInputElement>(null);
  const schema = z.record(z.string(), z.string().max(5000, "Keep each field under 5,000 characters."));
  const defaultValues = definition.fields.reduce<Record<string, string>>((values, label) => {
    values[fieldKey(label)] = record && record !== "new" ? record.data[fieldKey(label)] ?? legacyQualificationValue(record, label) ?? "" : "";
    return values;
  }, {});
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues });
  const isOpen = record !== null;

  useEffect(() => form.reset(defaultValues), [record]);

  async function submit(values: Record<string, string>) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    const file = fileInput.current?.files?.[0];
    if (file) formData.set("profileFile", file);
    await onSave(formData);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <WideSheetContent>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <SheetHeader><SheetTitle>{record === "new" ? `Add ${definition.title}` : `Edit ${definition.title}`}</SheetTitle><SheetDescription>Keep these details current on your staff record.</SheetDescription></SheetHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((label, index) => <FormField key={label} control={form.control} name={fieldKey(label)} render={({ field }) => <FormItem className={index === definition.fields.length - 1 && label.length > 24 ? "sm:col-span-2" : ""}>
              <FormLabel>{label}</FormLabel><FormControl>{label === "Responsibilities" || label === "Address" || label === "Notes" ? <Textarea {...field} /> : <Input {...field} type={inputType(label)} />}</FormControl><FormMessage />
            </FormItem>} />)}
            {(section === "document" || section === "qualification") && <div className="sm:col-span-2"><Label htmlFor="profileFile">{section === "qualification" ? "Upload an academic document" : "Upload the document"}</Label><Input ref={fileInput} id="profileFile" name="profileFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">PDF, image, or Word file up to 10 MB.</p></div>}
          </div>
          <SheetFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save record"}</Button></SheetFooter>
        </form></Form>
      </WideSheetContent>
    </Sheet>
  );
}

function fieldKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean).map((word, index) => index === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join("");
}

function legacyQualificationValue(record: ProfileEntry, label: string) {
  if (record.section !== "qualification") return undefined;
  const legacyKey = { Institute: "institution", "Course or field of study": "award" }[label as "Institute" | "Course or field of study"];
  return legacyKey ? record.data[legacyKey] : undefined;
}

function inputType(label: string): "text" | "date" | "email" | "tel" | "number" {
  if (/date/i.test(label)) return "date";
  if (/year/i.test(label)) return "number";
  if (/email/i.test(label)) return "email";
  if (/phone/i.test(label)) return "tel";
  return "text";
}

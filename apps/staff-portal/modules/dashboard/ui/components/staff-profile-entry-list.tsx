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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
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
      if (section === "document" && file instanceof File && file.size > 0) {
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
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{definition.title}</CardTitle>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-1 size-4" />Add</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sectionEntries.length === 0 ? <p className="rounded-lg bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">No {definition.title.toLowerCase()} on file yet.</p> : sectionEntries.map((entry) => (
          <div key={entry._id} className="flex items-start justify-between gap-4 rounded-lg bg-muted/35 p-4">
            <div className="min-w-0">
              <p className="font-medium">{entry.title || definition.title}</p>
              <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {definition.fields.slice(1).map((label) => <p key={label} className="truncate text-sm text-muted-foreground">{label}: {entry.data[fieldKey(label)] || "Not provided"}</p>)}
              </div>
              {entry.data.fileName && <p className="mt-2 text-xs text-muted-foreground">File: {entry.data.fileName}</p>}
              {entry.fileUrl && <a href={entry.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4">View attached file</a>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label={`Edit ${definition.title}`} onClick={() => setEditing(entry)}><Pencil className="size-4" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Delete ${definition.title}`}><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Remove this record?</AlertDialogTitle><AlertDialogDescription>This removes the selected entry from your staff profile.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void remove(entry._id)}>Remove</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
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
    values[fieldKey(label)] = record && record !== "new" ? record.data[fieldKey(label)] ?? "" : "";
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <DialogHeader><DialogTitle>{record === "new" ? `Add ${definition.title}` : `Edit ${definition.title}`}</DialogTitle><DialogDescription>Keep these details current on your staff record.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((label, index) => <FormField key={label} control={form.control} name={fieldKey(label)} render={({ field }) => <FormItem className={index === definition.fields.length - 1 && label.length > 24 ? "sm:col-span-2" : ""}>
              <FormLabel>{label}</FormLabel><FormControl>{label === "Responsibilities" || label === "Address" || label === "Notes" ? <Textarea {...field} /> : <Input {...field} type={inputType(label)} />}</FormControl><FormMessage />
            </FormItem>} />)}
            {section === "document" && <div className="sm:col-span-2"><Label htmlFor="profileFile">Upload the document</Label><Input ref={fileInput} id="profileFile" name="profileFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">PDF, image, or Word file up to 10 MB.</p></div>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save record"}</Button></DialogFooter>
        </form></Form>
      </DialogContent>
    </Dialog>
  );
}

function fieldKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean).map((word, index) => index === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join("");
}

function inputType(label: string): "text" | "date" | "email" | "tel" | "number" {
  if (/date/i.test(label)) return "date";
  if (/year/i.test(label)) return "number";
  if (/email/i.test(label)) return "email";
  if (/phone/i.test(label)) return "tel";
  return "text";
}

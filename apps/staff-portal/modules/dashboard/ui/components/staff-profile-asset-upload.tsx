"use client";

import { useRef, useState } from "react";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { api } from "@workspace/backend/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

interface StaffProfileAssetUploadProps {
  asset: "photo" | "signature";
  url: string | null;
}

export function StaffProfileAssetUpload({ asset, url }: StaffProfileAssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useMutation(api.staffPersonalRecords.generateMyProfileUploadUrl);
  const saveAsset = useMutation(api.staffPersonalRecords.saveMyProfileImage);
  const label = asset === "photo" ? "Profile photograph" : "Signature";

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (!(["image/png", "image/jpeg"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
      toast.error("Choose an image file no larger than 5 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Upload failed");
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || !("storageId" in result) || typeof result.storageId !== "string") throw new Error("Invalid upload response");
      await saveAsset({ asset, fileId: result.storageId as Id<"_storage"> });
      if (inputRef.current) inputRef.current.value = "";
      toast.success(`${label} updated`);
    } catch {
      toast.error(`Could not update ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
    }
  }

  return <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader><CardContent className="space-y-3">
    {url ? <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline underline-offset-4">View current {label.toLowerCase()}</a> : <p className="text-sm text-muted-foreground">No {label.toLowerCase()} on file.</p>}
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"><div><Label htmlFor={`profile-${asset}`}>Upload image</Label><Input ref={inputRef} id={`profile-${asset}`} type="file" accept="image/png,image/jpeg" className="mt-1" /></div><Button type="button" onClick={() => void upload()} disabled={isUploading}>{isUploading ? "Uploading…" : `Save ${label.toLowerCase()}`}</Button></div>
  </CardContent></Card>;
}

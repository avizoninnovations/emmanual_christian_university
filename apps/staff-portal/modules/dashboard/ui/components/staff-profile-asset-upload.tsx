"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { api } from "@workspace/backend/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Camera, FileImage, PenLine, UploadCloud } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useMutation(api.staffPersonalRecords.generateMyProfileUploadUrl);
  const saveAsset = useMutation(api.staffPersonalRecords.saveMyProfileImage);
  const label = asset === "photo" ? "Profile photograph" : "Signature";
  const PreviewIcon = asset === "photo" ? Camera : PenLine;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectImage(nextFile?: File) {
    if (!nextFile) return;
    if (!(nextFile.type === "image/png" || nextFile.type === "image/jpeg") || nextFile.size > 5 * 1024 * 1024) {
      toast.error("Choose a PNG or JPEG image no larger than 5 MB.");
      return;
    }
    setFile(nextFile);
  }

  async function upload() {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Upload failed");
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || !("storageId" in result) || typeof result.storageId !== "string") throw new Error("Invalid upload response");
      await saveAsset({ asset, fileId: result.storageId as Id<"_storage"> });
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      toast.success(`${label} updated`);
    } catch {
      toast.error(`Could not update ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 bg-card/80 shadow-sm">
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-base"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><PreviewIcon className="size-4" /></span>{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectImage(event.dataTransfer.files[0]); }}
          className={`flex min-h-32 items-center gap-4 rounded-xl border border-dashed p-4 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/25 hover:bg-muted/45"}`}
        >
          {asset === "photo" ? (
            <Avatar className="size-14 shrink-0 rounded-xl">
              <AvatarImage src={previewUrl ?? url ?? undefined} alt="Profile photograph preview" />
              <AvatarFallback className="rounded-xl bg-background text-primary"><Camera className="size-5" /></AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background px-2">
              {previewUrl || url ? <Image src={previewUrl ?? url ?? ""} alt="Signature preview" width={144} height={64} unoptimized className="max-h-full max-w-full object-contain" /> : <FileImage className="size-5 text-muted-foreground" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file ? file.name : isDragging ? "Drop your image here" : url ? "Current image saved" : `Add your ${label.toLowerCase()}`}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Drag an image here or choose a file. PNG or JPEG, up to 5 MB.</p>
            <Button type="button" variant="link" className="mt-1 h-auto p-0 text-sm" onClick={() => inputRef.current?.click()}>
              {file ? "Choose a different file" : "Choose a file"}
            </Button>
            <Label htmlFor={`profile-${asset}`} className="sr-only">Choose {label.toLowerCase()}</Label>
            <Input ref={inputRef} id={`profile-${asset}`} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><UploadCloud className="size-4 shrink-0" /><span className="truncate">{file ? "Ready to save" : "Your image stays private to your staff profile"}</span></span>
          <Button type="button" className="shrink-0 rounded-lg" onClick={() => void upload()} disabled={isUploading || !file}>{isUploading ? "Uploading…" : `Save ${asset}`}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

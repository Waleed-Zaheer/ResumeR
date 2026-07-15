"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { personalInfoSchema } from "@/lib/validations/resume";
import type { PersonalInfo } from "@/lib/types/resume";
import { useResumeStore } from "@/store/resume-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function StepPersonalInfo() {
  const personalInfo = useResumeStore((s) => s.data.personalInfo);
  const setData = useResumeStore((s) => s.setData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema) as Resolver<PersonalInfo>,
    defaultValues: personalInfo,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = watch((values) => {
      setData({ personalInfo: values as PersonalInfo });
    });
    return () => subscription.unsubscribe();
  }, [watch, setData]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo is too large. Please choose one under 1.5MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setValue("photo", dataUrl, { shouldDirty: true });
      setData({ personalInfo: { ...personalInfo, photo: dataUrl } });
    } catch {
      setPhotoError("Couldn't read that photo. Please try a different file.");
    }
  }

  function removePhoto() {
    setValue("photo", "", { shouldDirty: true });
    setData({ personalInfo: { ...personalInfo, photo: "" } });
    setPhotoError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Personal Info</h2>
        <p className="text-sm text-muted-foreground">
          How employers will identify and reach you.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Photo (optional)</Label>
        <div className="flex items-center gap-4">
          {personalInfo.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not an optimizable remote asset */
            <img
              src={personalInfo.photo}
              alt="Profile"
              className="size-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
              None
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {personalInfo.photo ? "Change photo" : "Upload photo"}
              </Button>
              {personalInfo.photo && (
                <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                  <X />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Used by the Europass template. Optional — omit it to keep your resume ATS-friendly.
            </p>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" placeholder="e.g. Senior Product Designer" {...register("jobTitle")} />
          {errors.jobTitle && (
            <p className="text-sm text-destructive">{errors.jobTitle.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="City, State" {...register("location")} />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" placeholder="https://" {...register("website")} />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" placeholder="e.g. German" {...register("nationality")} />
          <p className="text-xs text-muted-foreground">Used by the Europass template.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          <p className="text-xs text-muted-foreground">Used by the Europass template.</p>
        </div>
      </div>
    </div>
  );
}

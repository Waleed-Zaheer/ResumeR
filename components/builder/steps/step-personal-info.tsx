"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalInfoSchema } from "@/lib/validations/resume";
import type { PersonalInfo } from "@/lib/types/resume";
import { useResumeStore } from "@/store/resume-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function StepPersonalInfo() {
  const personalInfo = useResumeStore((s) => s.data.personalInfo);
  const setData = useResumeStore((s) => s.setData);

  const {
    register,
    watch,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Personal Info</h2>
        <p className="text-sm text-muted-foreground">
          How employers will identify and reach you.
        </p>
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

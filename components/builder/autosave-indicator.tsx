"use client";

import { AlertCircle, Check, HardDrive } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { cn } from "@/lib/utils";

export function AutosaveIndicator({ className }: { className?: string }) {
  const saveStatus = useResumeStore((s) => s.saveStatus);

  if (saveStatus === "idle") return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {saveStatus === "saved" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="size-3.5" />
          Saved on this device
        </span>
      )}
      {saveStatus === "error" && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="size-3.5" />
          Couldn&apos;t save locally — export often to avoid losing work
        </span>
      )}
      {saveStatus === "saving" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Check className="size-3.5" />
          Saving…
        </span>
      )}
    </div>
  );
}

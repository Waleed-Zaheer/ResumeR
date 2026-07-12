"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { updateResumeAction } from "@/lib/actions/resume-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AutosaveIndicator({
  resumeId,
  className,
}: {
  resumeId: string;
  className?: string;
}) {
  const saveStatus = useResumeStore((s) => s.saveStatus);
  const data = useResumeStore((s) => s.data);
  const setSaveStatus = useResumeStore((s) => s.setSaveStatus);
  const [isPending, startTransition] = useTransition();

  function retry() {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateResumeAction(resumeId, data);
      if (result.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        toast.error(result.error || "Failed to save resume");
      }
    });
  }

  if (saveStatus === "idle") return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {saveStatus === "saving" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Saving…
        </span>
      )}
      {saveStatus === "saved" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Check className="size-3.5" />
          Saved
        </span>
      )}
      {saveStatus === "error" && (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="size-3.5" />
          Error saving
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={retry}
            disabled={isPending}
            className="h-auto px-1.5 py-0 text-destructive underline underline-offset-2"
          >
            Retry
          </Button>
        </span>
      )}
    </div>
  );
}

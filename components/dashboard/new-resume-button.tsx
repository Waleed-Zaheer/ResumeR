"use client";

import { useTransition } from "react";
import { createResumeAction } from "@/lib/actions/resume-actions";
import { Button } from "@/components/ui/button";

export function NewResumeButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => createResumeAction())}
    >
      {pending ? "Creating..." : "New Resume"}
    </Button>
  );
}

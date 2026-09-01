"use client";

import { useRouter } from "next/navigation";
import { createResumeEntry } from "@/store/resume-list";
import { topLoader } from "@/lib/top-loader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NewResumeButton({ className }: { className?: string }) {
  const router = useRouter();

  function handleClick() {
    const entry = createResumeEntry();
    // Programmatic navigation (not a link click), so TopLoader's click
    // interceptor won't see it — start the bar explicitly.
    topLoader.start();
    router.push(`/builder?id=${entry.id}`);
  }

  return (
    <Button className={className} onClick={handleClick}>
      <Plus />
      New Resume
    </Button>
  );
}

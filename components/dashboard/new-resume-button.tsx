"use client";

import { useRouter } from "next/navigation";
import { DRAFT_STORAGE_KEY } from "@/store/resume-store";
import { topLoader } from "@/lib/top-loader";
import { Button } from "@/components/ui/button";

export function NewResumeButton({ className }: { className?: string }) {
  const router = useRouter();

  function handleClick() {
    // No server-side resume storage — "new resume" just clears the locally
    // saved draft before entering the builder.
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear the previous draft", error);
    }
    // Programmatic navigation (not a link click), so TopLoader's click
    // interceptor won't see it — start the bar explicitly.
    topLoader.start();
    router.push("/builder");
  }

  return (
    <Button className={className} onClick={handleClick}>
      New Resume
    </Button>
  );
}

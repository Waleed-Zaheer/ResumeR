"use client";

import { useRouter } from "next/navigation";
import { DRAFT_STORAGE_KEY } from "@/store/resume-store";
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
    router.push("/builder");
  }

  return (
    <Button className={className} onClick={handleClick}>
      New Resume
    </Button>
  );
}

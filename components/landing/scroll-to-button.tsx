"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

interface ScrollToButtonProps extends ComponentProps<typeof Button> {
  targetId: string;
}

/**
 * A Button that smooth-scrolls to an in-page section by id, used for the
 * hero's "See templates" CTA. Isolated in its own client component so
 * hero.tsx can stay a Server Component.
 */
export function ScrollToButton({ targetId, onClick, ...props }: ScrollToButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    />
  );
}

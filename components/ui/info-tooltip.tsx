"use client"

/**
 * InfoTooltip — a small "i" icon that reveals a short hint on hover/focus.
 * Meant to sit inline next to a form field's label.
 *
 * Usage:
 *   <Label>Email <InfoTooltip content="We'll never share this." /></Label>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/components/ui/tooltip.tsx
 */
import { Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InfoTooltipProps {
  content: string
  className?: string
  iconClassName?: string
  side?: "top" | "right" | "bottom" | "left"
}

export function InfoTooltip({ content, className, iconClassName, side = "top" }: InfoTooltipProps) {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                "inline-flex items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-muted-foreground",
                className
              )}
              onClick={(event) => event.preventDefault()}
            >
              <Info className={cn("w-3.5 h-3.5", iconClassName)} />
            </button>
          }
        />
        <TooltipContent side={side} className="max-w-[280px] text-xs leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

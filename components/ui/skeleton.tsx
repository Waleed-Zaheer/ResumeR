"use client"

/**
 * Skeleton — a pulsing placeholder block shown while content loads.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

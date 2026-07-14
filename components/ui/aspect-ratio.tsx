"use client"

/**
 * AspectRatio — constrains its content to a fixed width/height ratio
 * via CSS `aspect-ratio` (e.g. keep an image or video at 16:9).
 *
 * Usage:
 *   <AspectRatio ratio={16 / 9}>
 *     <img src="..." className="h-full w-full object-cover" />
 *   </AspectRatio>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import { cn } from "@/lib/utils"

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
        } as React.CSSProperties
      }
      className={cn("relative aspect-(--ratio)", className)}
      {...props}
    />
  )
}

export { AspectRatio }

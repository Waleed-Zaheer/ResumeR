import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FieldErrors } from "react-hook-form"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Look up the validation error message for a field by its react-hook-form
 * path (e.g. `contacts.0.relationship`). RHF stores errors in nested form,
 * so `errors["contacts.0.relationship"]` returns undefined — this walker
 * follows the dotted/bracketed segments to find the real entry.
 */
export function getFieldError(errors: FieldErrors | undefined, name: string): string | undefined {
  if (!errors || !name) return undefined
  const segments = name.replace(/\[(\d+)\]/g, ".$1").split(".")
  let cursor: unknown = errors
  for (const seg of segments) {
    if (cursor == null || typeof cursor !== "object") return undefined
    cursor = (cursor as Record<string, unknown>)[seg]
  }
  return (cursor as { message?: string } | undefined)?.message
}

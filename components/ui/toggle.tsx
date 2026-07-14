"use client"

/**
 * Toggle — a two-state button that's either pressed or not (e.g. a bold
 * button in a text toolbar). For a connected group of these where only
 * one (or several) can be pressed at once, use ToggleGroup instead.
 *
 * Usage:
 *   <Toggle aria-label="Toggle bold"><Bold /></Toggle>
 *   <Toggle pressed={isBold} onPressedChange={setIsBold}>...</Toggle>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 */
import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-3xl text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default:
          "h-9 min-w-9 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        sm: "h-8 min-w-8 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 min-w-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  disabled,
  onClick,
  type,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "disabled"> &
  VariantProps<typeof toggleVariants> & {
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
    disabled?: boolean
  }) {
  const [pressed, setPressed] = useControllableState({
    prop: pressedProp,
    defaultProp: defaultPressed,
    onChange: onPressedChange,
  })

  return (
    <button
      type={type ?? "button"}
      data-slot="toggle"
      data-pressed={pressed ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setPressed(!pressed)
      }}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }

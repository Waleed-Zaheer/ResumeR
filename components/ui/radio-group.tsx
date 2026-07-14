"use client"

/**
 * RadioGroup / RadioGroupItem — a set of mutually exclusive options.
 * Arrow keys move focus AND selection between items (native radio-button
 * behavior); only one item is in the Tab order at a time.
 *
 * Usage:
 *   <RadioGroup defaultValue="comfortable">
 *     <RadioGroupItem value="default" id="r1" />
 *     <Label htmlFor="r1">Default</Label>
 *     ...
 *   </RadioGroup>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-roving-focus.ts (arrow-key navigation + selection)
 */
import { createContext, useContext, type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRovingFocus } from "@/lib/primitives/use-roving-focus"

const RadioGroupContext = createContext<{
  value: string | undefined
  setValue: (value: string) => void
  disabled?: boolean
}>({ value: undefined, setValue: () => {} })

function RadioGroup({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  orientation = "vertical",
  loopFocus = true,
  onKeyDown,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "onKeyDown" | "onChange"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  orientation?: "horizontal" | "vertical"
  loopFocus?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
}) {
  const [value, setValue] = useControllableState<string | undefined>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })

  const { containerRef, onKeyDown: onRovingKeyDown } = useRovingFocus<HTMLDivElement>({
    orientation,
    loop: loopFocus,
    isItemActive: (el) => el.getAttribute("aria-checked") === "true",
    onActivate: (el) => el.click(),
    deps: [value],
  })

  return (
    <RadioGroupContext.Provider value={{ value, setValue, disabled }}>
      <div
        ref={containerRef}
        role="radiogroup"
        data-slot="radio-group"
        data-orientation={orientation}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          onRovingKeyDown(event)
        }}
        className={cn("grid w-full gap-3", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  disabled: itemDisabled,
  onClick,
  ...props
}: Omit<ComponentPropsWithoutRef<"span">, "onChange"> & {
  value: string
  disabled?: boolean
}) {
  const context = useContext(RadioGroupContext)
  const checked = context.value === value
  const isDisabled = context.disabled || itemDisabled

  return (
    <span
      role="radio"
      aria-checked={checked}
      aria-disabled={isDisabled || undefined}
      data-roving-item=""
      data-slot="radio-group-item"
      data-disabled={isDisabled ? "true" : undefined}
      data-checked={checked ? "" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) context.setValue(value)
      }}
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-transparent bg-input/90 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      {checked && (
        <span
          data-slot="radio-group-indicator"
          className="flex size-4 items-center justify-center"
        >
          <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground dark:size-2.5" />
        </span>
      )}
    </span>
  )
}

export { RadioGroup, RadioGroupItem }

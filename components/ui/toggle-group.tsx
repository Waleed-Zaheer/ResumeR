"use client"

/**
 * ToggleGroup — a connected row/column of toggle buttons where pressing
 * one can exclusively select it (default) or, with `multiple`, several
 * can be pressed at once. Arrow keys move focus between buttons.
 *
 * Usage:
 *   <ToggleGroup defaultValue={["bold"]}>
 *     <ToggleGroupItem value="bold" aria-label="Toggle bold"><Bold /></ToggleGroupItem>
 *     <ToggleGroupItem value="italic" aria-label="Toggle italic"><Italic /></ToggleGroupItem>
 *   </ToggleGroup>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-roving-focus.ts (arrow-key navigation)
 *   - src/components/ui/toggle.tsx (toggleVariants, for matching styles)
 */
import { createContext, useContext, type ComponentPropsWithoutRef } from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRovingFocus } from "@/lib/primitives/use-roving-focus"
import { toggleVariants } from "@/components/ui/toggle"

type Orientation = "horizontal" | "vertical"

const ToggleGroupContext = createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: Orientation
    values: string[]
    toggleValue: (value: string) => void
    disabled?: boolean
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
  values: [],
  toggleValue: () => {},
  disabled: false,
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  loopFocus = true,
  children,
  onKeyDown,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "onKeyDown"> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: Orientation
    value?: readonly string[]
    defaultValue?: readonly string[]
    onValueChange?: (value: string[]) => void
    multiple?: boolean
    disabled?: boolean
    loopFocus?: boolean
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  }) {
  const [values, setValues] = useControllableState<string[]>({
    prop: value ? [...value] : undefined,
    defaultProp: defaultValue ? [...defaultValue] : [],
    onChange: onValueChange,
  })

  const { containerRef, onKeyDown: onRovingKeyDown } = useRovingFocus<HTMLDivElement>({
    orientation,
    loop: loopFocus,
    isItemActive: (el) => el.getAttribute("data-pressed") !== null,
    deps: [values],
  })

  function toggleValue(itemValue: string) {
    if (multiple) {
      setValues(
        values.includes(itemValue)
          ? values.filter((v) => v !== itemValue)
          : [...values, itemValue]
      )
    } else {
      setValues(values.includes(itemValue) ? [] : [itemValue])
    }
  }

  return (
    <ToggleGroupContext.Provider
      value={{ variant, size, spacing, orientation, values, toggleValue, disabled }}
    >
      <div
        ref={containerRef}
        data-slot="toggle-group"
        data-variant={variant}
        data-size={size}
        data-spacing={spacing}
        data-orientation={orientation}
        role="group"
        style={{ "--gap": spacing } as React.CSSProperties}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          onRovingKeyDown(event)
        }}
        className={cn(
          "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] data-[spacing=0]:data-[variant=outline]:rounded-3xl data-vertical:flex-col data-vertical:items-stretch",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  value,
  disabled: itemDisabled,
  onClick,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "disabled" | "value"> &
  VariantProps<typeof toggleVariants> & {
    value: string
    disabled?: boolean
  }) {
  const context = useContext(ToggleGroupContext)
  const pressed = context.values.includes(value)
  const isDisabled = context.disabled || itemDisabled

  return (
    <button
      type="button"
      data-roving-item=""
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      data-pressed={pressed ? "" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      aria-pressed={pressed}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.toggleValue(value)
      }}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-3 group-data-[spacing=0]/toggle-group:shadow-none focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-2.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-2.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-3xl group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-3xl group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-3xl group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-3xl data-[state=on]:bg-muted group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { ToggleGroup, ToggleGroupItem }

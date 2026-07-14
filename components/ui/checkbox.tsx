"use client"

/**
 * Checkbox — a tri-state (checked/unchecked/indeterminate) checkbox, with
 * a hidden native input alongside it so it still participates in forms.
 *
 * Usage:
 *   <Checkbox defaultChecked />
 *   <Checkbox checked={value} onCheckedChange={setValue} />
 *   <Checkbox indeterminate />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 */
import { CheckIcon } from "lucide-react"
import type { ComponentPropsWithoutRef, KeyboardEvent, Ref } from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"

function Checkbox({
  className,
  checked: checkedProp,
  defaultChecked = false,
  indeterminate = false,
  onCheckedChange,
  disabled = false,
  readOnly = false,
  required,
  name,
  form,
  value = "on",
  inputRef,
  id,
  onClick,
  onKeyDown,
  ...props
}: Omit<ComponentPropsWithoutRef<"span">, "onChange"> & {
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  form?: string
  value?: string
  inputRef?: Ref<HTMLInputElement>
}) {
  const [checked, setChecked] = useControllableState({
    prop: checkedProp,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })

  function toggle() {
    if (disabled || readOnly) return
    setChecked(!checked)
  }

  return (
    <span
      role="checkbox"
      id={id}
      aria-checked={indeterminate ? "mixed" : checked}
      aria-readonly={readOnly || undefined}
      aria-required={required || undefined}
      tabIndex={disabled ? undefined : 0}
      data-slot="checkbox"
      data-checked={checked ? "" : undefined}
      data-unchecked={!checked ? "" : undefined}
      data-indeterminate={indeterminate ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) toggle()
      }}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === " ") {
          event.preventDefault()
          toggle()
        }
      }}
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-transparent bg-input/90 transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      {(checked || indeterminate) && (
        <span
          data-slot="checkbox-indicator"
          className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
        >
          <CheckIcon />
        </span>
      )}
      <input
        type="checkbox"
        ref={inputRef}
        checked={checked}
        onChange={() => {}}
        name={name}
        form={form}
        value={value}
        required={required}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          border: 0,
        }}
      />
    </span>
  )
}

export { Checkbox }

"use client"

/**
 * FormInput — an <Input> registered against a react-hook-form field, with
 * a label, required/tooltip/description row, prefix/suffix slots, and an
 * inline error message. `type="date"` delegates to FormDate. Must be
 * rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormInput name="email" label="Email" required placeholder="you@example.com" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/input.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 *   - src/components/ui/form-date.tsx (type="date" delegation)
 */
import type { ReactNode } from "react"
import { useFormContext, type FieldValues, type Path, type RegisterOptions } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"
import { FormDate } from "@/components/ui/form-date"

interface FormInputProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  type?: string
  disabled?: boolean
  warnMissing?: boolean
  registerOptions?: RegisterOptions<T, Path<T>>
  prefix?: ReactNode
  suffix?: ReactNode
  maxLength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}

export function FormInput<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder,
  className,
  inputClassName,
  type = "text",
  disabled,
  warnMissing,
  registerOptions,
  prefix,
  suffix,
  maxLength,
  min,
  max,
  step,
  inputMode,
}: FormInputProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()

  // Date fields use the Calendar-backed picker via FormDate everywhere —
  // delegate so every `<FormInput type="date">` gets the same behavior
  // without per-call edits.
  if (type === "date") {
    return (
      <FormDate<T>
        name={name}
        label={label}
        required={required}
        tooltip={tooltip}
        description={description}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        triggerClassName={inputClassName}
        min={min !== undefined ? String(min) : undefined}
        max={max !== undefined ? String(max) : undefined}
      />
    )
  }

  const errorMsg = getFieldError(errors, name as string)

  const borderClass = errorMsg
    ? "border-destructive"
    : warnMissing
      ? "border-amber-300 dark:border-amber-700"
      : ""

  const input = (
    <Input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      min={min}
      max={max}
      step={step}
      inputMode={inputMode}
      className={cn(inputClassName, borderClass)}
      {...register(name, registerOptions)}
    />
  )

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-[12px] font-medium">
          {label}
          {required && <span className="text-destructive">*</span>}
          {tooltip && <InfoTooltip content={tooltip} iconClassName="w-3 h-3" />}
        </Label>
      )}
      {description && <p className="text-[12px] text-muted-foreground leading-snug -mt-0.5">{description}</p>}
      {prefix || suffix ? (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              {prefix}
            </span>
          )}
          {input}
          {suffix && <span className="absolute top-1/2 right-3 -translate-y-1/2">{suffix}</span>}
        </div>
      ) : (
        input
      )}
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

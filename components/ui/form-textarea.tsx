"use client"

/**
 * FormTextarea — a <Textarea> registered against a react-hook-form field,
 * with a label, required/tooltip/description row, and an inline error
 * message. Must be rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormTextarea name="notes" label="Notes" rows={4} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/textarea.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { useFormContext, type FieldValues, type Path, type RegisterOptions } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"

interface FormTextareaProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  textareaClassName?: string
  disabled?: boolean
  warnMissing?: boolean
  maxLength?: number
  rows?: number
  registerOptions?: RegisterOptions<T, Path<T>>
}

export function FormTextarea<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder,
  className,
  textareaClassName,
  disabled,
  warnMissing,
  maxLength,
  rows,
  registerOptions,
}: FormTextareaProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>()

  const errorMsg = getFieldError(errors, name as string)

  const borderClass = errorMsg
    ? "border-destructive"
    : warnMissing
      ? "border-amber-300 dark:border-amber-700"
      : ""

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
      <Textarea
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        className={cn("min-h-20 resize-none", borderClass, textareaClassName)}
        {...register(name, registerOptions)}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

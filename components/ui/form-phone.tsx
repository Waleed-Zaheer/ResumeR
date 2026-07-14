"use client"

/**
 * FormPhone — a phone-number <Input> registered against a react-hook-form
 * field, with a label, required/tooltip/description row, and an inline
 * error message. Must be rendered inside a <FormProvider>.
 *
 * This is a simplified stand-in for a full country-code + validation
 * widget — it's a plain `type="tel"` input; pass a pattern/validator via
 * `registerOptions` if you need format enforcement.
 *
 * Usage:
 *   <FormPhone name="phone" label="Phone number" required />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/input.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { useFormContext, type FieldValues, type Path, type RegisterOptions } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"

interface FormPhoneProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  warnMissing?: boolean
  registerOptions?: RegisterOptions<T, Path<T>>
}

export function FormPhone<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder = "e.g. 07700 900123",
  className,
  inputClassName,
  disabled,
  warnMissing,
  registerOptions,
}: FormPhoneProps<T>) {
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
      <Input
        type="tel"
        inputMode="tel"
        placeholder={placeholder}
        disabled={disabled}
        className={cn(inputClassName, borderClass)}
        {...register(name, registerOptions)}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

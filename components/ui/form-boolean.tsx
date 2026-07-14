"use client"

/**
 * FormBoolean — a Yes/No toggle wired to a react-hook-form field via
 * Controller. Must be rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormBoolean name="employed" label="Currently employed?" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"

interface FormBooleanProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FormBoolean<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  className,
  disabled,
}: FormBooleanProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>()

  const errorMsg = getFieldError(errors, name as string)

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
      <Controller
        control={control}
        name={name}
        defaultValue={null as never}
        render={({ field }) => (
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                disabled={disabled}
                onClick={() => field.onChange(val)}
                className={cn(
                  "flex-1 py-2.5 rounded-sm border text-[13px] font-semibold transition-all",
                  field.value === val
                    ? val
                      ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-red-300/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                    : "border-border hover:bg-muted/40 text-foreground",
                  disabled && "pointer-events-none opacity-60"
                )}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

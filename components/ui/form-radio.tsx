"use client"

/**
 * FormRadio — a set of mutually exclusive options rendered as selectable
 * cards, wired to a react-hook-form field via Controller. Must be
 * rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormRadio name="plan" label="Plan" options={[{ value: "pro", label: "Pro" }]} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 *   - src/components/ui/form-select.tsx (FormSelectOption)
 */
import { Check } from "lucide-react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"
import type { FormSelectOption } from "@/components/ui/form-select"

interface FormRadioProps<T extends FieldValues> {
  name: Path<T>
  options: FormSelectOption[]
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FormRadio<T extends FieldValues>({
  name,
  options,
  label,
  required,
  tooltip,
  description,
  className,
  disabled,
}: FormRadioProps<T>) {
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
        defaultValue={"" as never}
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            {options.map((opt) => {
              const checked = field.value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => field.onChange(opt.value)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-sm border text-left transition-all w-full",
                    checked
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-border hover:border-border/70 hover:bg-muted/40",
                    disabled && "pointer-events-none opacity-60"
                  )}
                >
                  <div
                    aria-hidden
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-[3px] border flex items-center justify-center",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-primary"
                    )}
                  >
                    {checked && <Check className="h-4 w-4" />}
                  </div>
                  <span className="flex-1 text-[13px] font-medium">{opt.label}</span>
                  {opt.score !== undefined && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">{opt.score} pts</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

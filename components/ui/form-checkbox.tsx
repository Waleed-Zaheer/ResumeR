"use client"

/**
 * FormCheckbox / FormCheckboxGroup — a single <Checkbox> or a group of
 * checkboxes, each wired to a react-hook-form field via Controller. Must
 * be rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormCheckbox name="agree" label="I agree to the terms" />
 *   <FormCheckboxGroup name="skills" label="Skills" options={[{ value: "ts", label: "TypeScript" }]} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/checkbox.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 *   - src/components/ui/form-select.tsx (FormSelectOption)
 */
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"
import type { FormSelectOption } from "@/components/ui/form-select"

interface FormCheckboxProps<T extends FieldValues> {
  name: Path<T>
  label: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FormCheckbox<T extends FieldValues>({
  name,
  label,
  description,
  className,
  disabled,
}: FormCheckboxProps<T>) {
  const { control } = useFormContext<T>()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className={cn("flex items-start gap-2.5 cursor-pointer", className)}>
          <Checkbox
            checked={!!field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
            className="mt-0.5 shrink-0"
          />
          <div>
            <span className="text-[12px]">{label}</span>
            {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
          </div>
        </label>
      )}
    />
  )
}

interface FormCheckboxGroupProps<T extends FieldValues> {
  name: Path<T>
  options: FormSelectOption[]
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FormCheckboxGroup<T extends FieldValues>({
  name,
  options,
  label,
  required,
  tooltip,
  description,
  className,
  disabled,
}: FormCheckboxGroupProps<T>) {
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
        defaultValue={[] as never}
        render={({ field, fieldState }) => {
          const checked: string[] = Array.isArray(field.value) ? field.value : []
          const toggle = (val: string) =>
            field.onChange(checked.includes(val) ? checked.filter((c) => c !== val) : [...checked, val])
          return (
            <div className={cn("space-y-1.5", fieldState.error && "ring-1 ring-destructive rounded-lg p-1")}>
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors",
                    checked.includes(opt.value) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                    disabled && "pointer-events-none opacity-60"
                  )}
                >
                  <Checkbox
                    checked={checked.includes(opt.value)}
                    onCheckedChange={() => toggle(opt.value)}
                    disabled={disabled}
                  />
                  <span className="text-[13px]">{opt.label}</span>
                  {opt.score !== undefined && (
                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{opt.score} pts</span>
                  )}
                </label>
              ))}
            </div>
          )
        }}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

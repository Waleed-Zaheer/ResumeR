"use client"

/**
 * FormSelect — a <Select> wired to a react-hook-form field via Controller,
 * with a label, required/tooltip/description row, and inline error message.
 * Must be rendered inside a <FormProvider>.
 *
 * Usage:
 *   <FormSelect name="role" label="Role" required options={[{ value: "admin", label: "Admin" }]} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/select.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import type { ReactNode } from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface FormSelectOption {
  value: string
  label: string
  score?: number
}

interface FormSelectProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  options?: FormSelectOption[]
  children?: ReactNode
  emptyLabel?: string
  warnMissing?: boolean
}

export function FormSelect<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder = "Select...",
  className,
  triggerClassName,
  disabled,
  options,
  children,
  emptyLabel,
  warnMissing,
}: FormSelectProps<T>) {
  const {
    control,
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
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value != null && field.value !== "" ? String(field.value) : undefined}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger className={cn("w-full", triggerClassName, borderClass)}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options ? (
                options.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-muted-foreground">{emptyLabel ?? "No options"}</div>
                ) : (
                  options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="truncate">{opt.label}</span>
                        {opt.score !== undefined && (
                          <span className="shrink-0 rounded bg-primary/8 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary/70">
                            {opt.score}pt
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))
                )
              ) : (
                children
              )}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

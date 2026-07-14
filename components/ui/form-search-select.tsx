"use client"

/**
 * FormSearchSelect — a searchable, filterable select built on the existing
 * <Combobox> primitive, wired to a react-hook-form field via Controller.
 * Must be rendered inside a <FormProvider>.
 *
 * This is a simplified stand-in for a full async search-select widget —
 * it filters a plain in-memory `options` array as you type.
 *
 * Usage:
 *   <FormSearchSelect name="country" label="Country" options={countries}
 *     getId={(c) => c.id} getLabel={(c) => c.name} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/combobox.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"

interface FormSearchSelectProps<T extends FieldValues, TOption> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  options: TOption[] | undefined
  getId: (option: TOption) => string | number
  getLabel: (option: TOption) => string
  placeholder?: string
  emptyLabel?: string
  isLoading?: boolean
  isError?: boolean
}

export function FormSearchSelect<T extends FieldValues, TOption>({
  name,
  label,
  required,
  tooltip,
  className,
  triggerClassName,
  disabled,
  options,
  getId,
  getLabel,
  placeholder = "Search…",
  emptyLabel,
  isLoading,
  isError,
}: FormSearchSelectProps<T, TOption>) {
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
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Combobox
            items={options?.map((opt) => String(getId(opt)))}
            value={field.value != null && field.value !== "" ? String(field.value) : null}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <ComboboxInput
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className={cn("w-full", triggerClassName, errorMsg && "border-destructive")}
            />
            <ComboboxContent>
              <ComboboxEmpty>
                {isError ? "Failed to load options." : isLoading ? "Loading…" : (emptyLabel ?? "No results.")}
              </ComboboxEmpty>
              <ComboboxList>
                {(options ?? []).map((opt) => (
                  <ComboboxItem key={String(getId(opt))} value={String(getId(opt))}>
                    {getLabel(opt)}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

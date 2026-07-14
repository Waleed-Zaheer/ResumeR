"use client"

/**
 * FormSearchSelectNested — a parent/child pair of searchable selects (built
 * on <Combobox>) where picking a parent filters the child's options. Only
 * the child is registered as a react-hook-form field; the parent is local
 * UI state used purely to narrow the child list. Must be rendered inside a
 * <FormProvider>.
 *
 * This is a simplified stand-in for a full cascading async search-select —
 * it filters plain in-memory option arrays as you type/select.
 *
 * Usage:
 *   <FormSearchSelectNested
 *     childName="cityId"
 *     parentOptions={countries} parentGetId={(c) => c.id} parentGetLabel={(c) => c.name}
 *     allChildOptions={cities} childGetId={(c) => c.id} childGetLabel={(c) => c.name}
 *     filterChild={(parentId, city) => city.countryId === parentId}
 *   />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/combobox.tsx
 *   - src/components/ui/field.tsx (FieldError)
 */
import { useMemo, useState } from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"

export interface FormSearchSelectNestedProps<TFieldValues extends FieldValues, TParent, TChild> {
  label?: string
  required?: boolean
  className?: string
  disabled?: boolean

  parentOptions: TParent[] | undefined
  parentGetId: (option: TParent) => string | number
  parentGetLabel: (option: TParent) => string
  parentPlaceholder?: string
  parentFieldLabel?: string

  childName: Path<TFieldValues>
  allChildOptions: TChild[] | undefined
  childGetId: (option: TChild) => string | number
  childGetLabel: (option: TChild) => string
  filterChild: (parentId: string, child: TChild) => boolean
  childPlaceholder?: string
  childFieldLabel?: string
}

export function FormSearchSelectNested<TFieldValues extends FieldValues, TParent, TChild>({
  label,
  required,
  className,
  disabled,
  parentOptions,
  parentGetId,
  parentGetLabel,
  parentPlaceholder = "Select…",
  parentFieldLabel,
  childName,
  allChildOptions,
  childGetId,
  childGetLabel,
  filterChild,
  childPlaceholder = "Select…",
  childFieldLabel,
}: FormSearchSelectNestedProps<TFieldValues, TParent, TChild>) {
  const {
    control,
    watch,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<TFieldValues>()

  const [parentId, setParentId] = useState<string | null>(null)
  const childValue = watch(childName) as string | number | undefined
  const errorMsg = getFieldError(errors, childName as string)

  const childOptions = useMemo(() => {
    if (parentId == null) return []
    return (allChildOptions ?? []).filter((child) => filterChild(parentId, child))
  }, [allChildOptions, parentId, filterChild])

  const fieldLabelClass = label ? "text-[11px] font-normal text-muted-foreground" : "text-[12px] font-medium"

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-[12px] font-medium">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          {parentFieldLabel && <Label className={fieldLabelClass}>{parentFieldLabel}</Label>}
          <Combobox
            items={parentOptions?.map((opt) => String(parentGetId(opt)))}
            value={parentId}
            onValueChange={(value) => {
              setParentId(value)
              // Changing the parent invalidates any child selection that no
              // longer matches it — clear it so we don't submit a stale pair.
              const stillValid =
                value != null &&
                childValue != null &&
                childValue !== "" &&
                (allChildOptions ?? []).some((c) => String(childGetId(c)) === String(childValue) && filterChild(value, c))
              if (!stillValid && childValue != null && childValue !== "") {
                setValue(childName, "" as never, { shouldDirty: true, shouldValidate: isSubmitted })
              }
            }}
          >
            <ComboboxInput placeholder={parentPlaceholder} disabled={disabled} className="w-full" />
            <ComboboxContent>
              <ComboboxEmpty>No results.</ComboboxEmpty>
              <ComboboxList>
                {(parentOptions ?? []).map((opt) => (
                  <ComboboxItem key={String(parentGetId(opt))} value={String(parentGetId(opt))}>
                    {parentGetLabel(opt)}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="space-y-1">
          {childFieldLabel && <Label className={fieldLabelClass}>{childFieldLabel}</Label>}
          <Controller
            control={control}
            name={childName}
            render={({ field }) => (
              <Combobox
                items={childOptions.map((opt) => String(childGetId(opt)))}
                value={field.value != null && field.value !== "" ? String(field.value) : null}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <ComboboxInput
                  placeholder={parentId ? childPlaceholder : "Select a parent first"}
                  disabled={disabled || !parentId}
                  className={cn("w-full", errorMsg && "border-destructive")}
                />
                <ComboboxContent>
                  <ComboboxEmpty>No results.</ComboboxEmpty>
                  <ComboboxList>
                    {childOptions.map((opt) => (
                      <ComboboxItem key={String(childGetId(opt))} value={String(childGetId(opt))}>
                        {childGetLabel(opt)}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
        </div>
      </div>

      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

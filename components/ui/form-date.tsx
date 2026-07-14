"use client"

/**
 * FormDate — a <Calendar> inside a <Popover>, wired to a react-hook-form
 * field via Controller, with a label, required/tooltip/description row,
 * and an inline error message. Must be rendered inside a <FormProvider>.
 *
 * Supports three selection shapes via `mode` (mirrors Calendar's own
 * `mode` prop):
 *   - "single"   (default) — field value is an ISO date string ("" when empty)
 *   - "multiple" — field value is a string[] of ISO dates
 *   - "range"    — field value is `{ from?: string; to?: string }`
 *
 * Usage:
 *   <FormDate name="dob" label="Date of birth" required />
 *   <FormDate name="stay" label="Stay dates" mode="range" />
 *   <FormDate name="blackoutDays" label="Blackout days" mode="multiple" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/calendar.tsx
 *   - src/components/ui/popover.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 *   - date-fns (date math - already a project dependency, not a UI library)
 */
import { useState, type ComponentProps } from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { FieldError } from "@/components/ui/field"

type FormDateMode = "single" | "multiple" | "range"
type CalendarDisabled = ComponentProps<typeof Calendar>["disabled"]
type CalendarSelected = ComponentProps<typeof Calendar>["selected"]
type RangeValue = { from?: string; to?: string }

const DISPLAY_FORMAT = "PP"
const STORAGE_FORMAT = "yyyy-MM-dd"

function toCalendarSelected(value: unknown, mode: FormDateMode): CalendarSelected {
  if (mode === "single") return typeof value === "string" && value ? parseISO(value) : undefined
  if (mode === "multiple") {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v).map((v) => parseISO(v)) : []
  }
  const range = (value ?? {}) as RangeValue
  return { from: range.from ? parseISO(range.from) : undefined, to: range.to ? parseISO(range.to) : undefined }
}

function toFieldValue(value: CalendarSelected, mode: FormDateMode): unknown {
  if (mode === "single") return value instanceof Date ? format(value, STORAGE_FORMAT) : ""
  if (mode === "multiple") return Array.isArray(value) ? value.map((d) => format(d, STORAGE_FORMAT)) : []
  const range = (value ?? {}) as { from?: Date; to?: Date }
  return {
    from: range.from ? format(range.from, STORAGE_FORMAT) : undefined,
    to: range.to ? format(range.to, STORAGE_FORMAT) : undefined,
  }
}

function hasValue(value: unknown, mode: FormDateMode): boolean {
  if (mode === "single") return typeof value === "string" && value.length > 0
  if (mode === "multiple") return Array.isArray(value) && value.length > 0
  return !!(value as RangeValue | undefined)?.from
}

function formatDisplay(value: unknown, mode: FormDateMode, placeholder: string): string {
  if (mode === "single") return typeof value === "string" && value ? format(parseISO(value), DISPLAY_FORMAT) : placeholder
  if (mode === "multiple") {
    const dates = Array.isArray(value) ? value : []
    if (dates.length === 0) return placeholder
    if (dates.length === 1) return format(parseISO(dates[0]), DISPLAY_FORMAT)
    return `${dates.length} dates selected`
  }
  const range = (value ?? {}) as RangeValue
  if (!range.from) return placeholder
  if (!range.to) return `${format(parseISO(range.from), DISPLAY_FORMAT)} – …`
  return `${format(parseISO(range.from), DISPLAY_FORMAT)} – ${format(parseISO(range.to), DISPLAY_FORMAT)}`
}

function buildDisabledMatcher(min?: string, max?: string): CalendarDisabled {
  if (min && max) return [{ before: parseISO(min) }, { after: parseISO(max) }] as CalendarDisabled
  if (min) return { before: parseISO(min) } as CalendarDisabled
  if (max) return { after: parseISO(max) } as CalendarDisabled
  return undefined
}

const DEFAULT_PLACEHOLDER: Record<FormDateMode, string> = {
  single: "Select a date",
  multiple: "Select dates",
  range: "Select a date range",
}

interface FormDateProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  warnMissing?: boolean
  /** Selection shape. Defaults to "single". See file header for the field
   * value shape each mode stores. */
  mode?: FormDateMode
  /** ISO date string ("yyyy-MM-dd") — dates before this are disabled. */
  min?: string
  /** ISO date string ("yyyy-MM-dd") — dates after this are disabled. */
  max?: string
}

export function FormDate<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder,
  className,
  triggerClassName,
  disabled,
  warnMissing,
  mode = "single",
  min,
  max,
}: FormDateProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>()

  const [open, setOpen] = useState(false)
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
        defaultValue={(mode === "multiple" ? [] : mode === "range" ? {} : "") as never}
        render={({ field }) => (
          <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
            <PopoverTrigger
              disabled={disabled}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-sm border border-input bg-background px-3 text-[12px]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                hasValue(field.value, mode) ? "text-foreground" : "text-muted-foreground",
                borderClass,
                triggerClassName
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="flex-1 truncate text-left">
                {formatDisplay(field.value, mode, placeholder ?? DEFAULT_PLACEHOLDER[mode])}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode={mode}
                selected={toCalendarSelected(field.value, mode)}
                onSelect={(value) => {
                  field.onChange(toFieldValue(value, mode))
                  if (mode === "single") setOpen(false)
                  if (mode === "range" && (value as { to?: Date } | undefined)?.to) setOpen(false)
                }}
                disabled={buildDisabledMatcher(min, max)}
                className="rounded-2xl border-0"
              />
            </PopoverContent>
          </Popover>
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

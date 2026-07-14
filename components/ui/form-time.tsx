"use client"

/**
 * FormTime — an hour/minute spinner inside a <Popover>, wired to a
 * react-hook-form field via Controller. Must be rendered inside a
 * <FormProvider>.
 *
 * Usage:
 *   <FormTime name="preferredTime" label="Preferred contact time" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/label.tsx
 *   - src/components/ui/popover.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { useEffect, useRef, useState } from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"

import { cn, getFieldError } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FieldError } from "@/components/ui/field"

function parseTime(value: string): { hours: number; minutes: number } {
  const [h, m] = (value ?? "").split(":")
  const hours = parseInt(h ?? "", 10)
  const minutes = parseInt(m ?? "", 10)
  return {
    hours: isNaN(hours) ? 0 : Math.min(hours, 23),
    minutes: isNaN(minutes) ? 0 : Math.min(minutes, 59),
  }
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function wrap(val: number, max: number) {
  return ((val % (max + 1)) + (max + 1)) % (max + 1)
}

interface SpinnerProps {
  value: number
  max: number
  onChange: (v: number) => void
  label: string
}

function Spinner({ value, max, onChange, label }: SpinnerProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  function increment() {
    onChange(wrap(value + 1, max))
  }
  function decrement() {
    onChange(wrap(value - 1, max))
  }

  function startEdit() {
    setDraft(String(value).padStart(2, "0"))
    setEditing(true)
  }

  function commitEdit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n)) onChange(Math.max(0, Math.min(n, max)))
    setEditing(false)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.deltaY < 0) increment()
    else decrement()
  }

  function handleSpinnerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      increment()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      decrement()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      startEdit()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setDraft(raw)
    if (raw.length === 2) {
      const n = parseInt(raw, 10)
      if (!isNaN(n)) onChange(Math.max(0, Math.min(n, max)))
      setEditing(false)
    }
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      commitEdit()
    } else if (e.key === "Escape") {
      setEditing(false)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      onChange(wrap(value + 1, max))
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      onChange(wrap(value - 1, max))
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <button
        type="button"
        onClick={increment}
        className="w-8 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      <div
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        tabIndex={editing ? -1 : 0}
        onClick={editing ? undefined : startEdit}
        onWheel={handleWheel}
        onKeyDown={editing ? undefined : handleSpinnerKey}
        title="Click to type a value"
        className={cn(
          "w-16 h-14 flex items-center justify-center rounded-md bg-muted/50 border border-border transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          editing ? "ring-2 ring-ring ring-offset-1 cursor-text" : "cursor-text hover:bg-muted/80"
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={draft}
            onChange={handleInputChange}
            onBlur={commitEdit}
            onKeyDown={handleInputKey}
            className="w-12 text-center text-3xl font-mono font-semibold tabular-nums tracking-tight bg-transparent border-none outline-none"
          />
        ) : (
          <span className="text-3xl font-mono font-semibold tabular-nums tracking-tight">
            {String(value).padStart(2, "0")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={decrement}
        className="w-8 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  )
}

export interface TimePickerBaseProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

export function TimePickerBase({
  value = "",
  onChange,
  placeholder = "--:--",
  disabled,
  invalid,
  className,
}: TimePickerBaseProps) {
  const [open, setOpen] = useState(false)
  const { hours, minutes } = parseTime(value)

  function setHours(h: number) {
    onChange?.(formatTime(h, minutes))
  }
  function setMinutes(m: number) {
    onChange?.(formatTime(hours, m))
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center gap-2 border border-input bg-background px-3 py-2 text-[12px] ring-offset-background rounded-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          value ? "text-foreground" : "text-muted-foreground",
          invalid && "border-destructive",
          className
        )}
      >
        <Clock className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="flex-1 text-left font-mono">{value || placeholder}</span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-4">
        <div className="flex items-center gap-2">
          <Spinner value={hours} max={23} onChange={setHours} label="HH" />

          <div className="flex flex-col items-center gap-1 pb-1 mt-6">
            <span className="text-2xl font-mono font-bold text-muted-foreground leading-none">:</span>
          </div>

          <Spinner value={minutes} max={59} onChange={setMinutes} label="MM" />
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">{formatTime(hours, minutes)}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FormTimeProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function FormTime<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  placeholder,
  className,
  disabled,
}: FormTimeProps<T>) {
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
        render={({ field }) => (
          <TimePickerBase
            value={field.value ?? ""}
            onChange={field.onChange}
            placeholder={placeholder ?? "--:--"}
            disabled={disabled}
            invalid={!!errorMsg}
          />
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

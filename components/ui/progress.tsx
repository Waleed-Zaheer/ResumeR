"use client"

/**
 * Progress — a horizontal bar showing how far along a task is, with
 * optional label/value text and an indeterminate state (value={null}).
 *
 * Usage:
 *   <Progress value={60} />
 *
 *   <Progress value={60}>
 *     <ProgressLabel>Uploading</ProgressLabel>
 *     <ProgressValue />
 *   </Progress>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import {
  createContext,
  useContext,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

type ProgressStatus = "indeterminate" | "progressing" | "complete"

type ProgressContextValue = {
  value: number | null
  min: number
  max: number
  status: ProgressStatus
  formattedValue: string
  labelId: string
}

const ProgressContext = createContext<ProgressContextValue>({
  value: null,
  min: 0,
  max: 100,
  status: "indeterminate",
  formattedValue: "",
  labelId: "",
})

function getStatus(value: number | null, max: number): ProgressStatus {
  if (value === null) return "indeterminate"
  return value >= max ? "complete" : "progressing"
}

function Progress({
  className,
  children,
  value,
  min = 0,
  max = 100,
  format,
  locale,
  getAriaValueText,
  "aria-valuetext": ariaValueTextProp,
  ...props
}: ComponentProps<"div"> & {
  children?: ReactNode
  value: number | null
  min?: number
  max?: number
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  getAriaValueText?: (
    formattedValue: string | null,
    value: number | null
  ) => string
}) {
  const labelId = useId()
  const status = getStatus(value, max)
  const formattedValue =
    value === null ? "" : new Intl.NumberFormat(locale, format).format(value)
  const ariaValueText =
    ariaValueTextProp ??
    getAriaValueText?.(formattedValue || null, value) ??
    undefined

  return (
    <ProgressContext.Provider
      value={{ value, min, max, status, formattedValue, labelId }}
    >
      <div
        role="progressbar"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-valuetext={ariaValueText}
        aria-labelledby={children ? labelId : undefined}
        data-slot="progress"
        data-complete={status === "complete" ? "" : undefined}
        data-indeterminate={status === "indeterminate" ? "" : undefined}
        data-progressing={status === "progressing" ? "" : undefined}
        className={cn("flex flex-wrap gap-3", className)}
        {...props}
      >
        {children}
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </div>
    </ProgressContext.Provider>
  )
}

function ProgressTrack({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="progress-track"
      className={cn(
        "relative flex h-3 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ComponentProps<"div">) {
  const { value, min, max, status } = useContext(ProgressContext)
  const percent =
    value === null ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div
      data-slot="progress-indicator"
      data-complete={status === "complete" ? "" : undefined}
      data-indeterminate={status === "indeterminate" ? "" : undefined}
      data-progressing={status === "progressing" ? "" : undefined}
      style={{ width: `${percent}%` }}
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({
  className,
  id,
  ...props
}: ComponentProps<"span">) {
  const { labelId } = useContext(ProgressContext)
  return (
    <span
      id={id ?? labelId}
      data-slot="progress-label"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ComponentProps<"span">) {
  const { formattedValue } = useContext(ProgressContext)
  return (
    <span
      data-slot="progress-value"
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    >
      {formattedValue}
    </span>
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}

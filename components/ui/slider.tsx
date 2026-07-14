"use client"

/**
 * Slider — a draggable control for picking one value, or several (a
 * range) if you pass an array with more than one number. Supports mouse
 * drag, touch, click-on-track-to-jump, and arrow-key/Home/End/PageUp/
 * PageDown keyboard control.
 *
 * Usage:
 *   <Slider defaultValue={[50]} max={100} step={1} />
 *   <Slider value={range} onValueChange={setRange} />        // [20, 80] range slider
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 */
import { useRef, type ComponentPropsWithoutRef, type PointerEvent as ReactPointerEvent } from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"

type Orientation = "horizontal" | "vertical"

function Slider({
  className,
  defaultValue,
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  orientation = "horizontal",
  minStepsBetweenValues = 0,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> & {
  defaultValue?: readonly number[]
  value?: readonly number[]
  onValueChange?: (value: number[]) => void
  onValueCommitted?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: Orientation
  minStepsBetweenValues?: number
}) {
  const [values, setValues] = useControllableState<number[]>({
    prop: value ? [...value] : undefined,
    defaultProp: defaultValue ? [...defaultValue] : [min, max],
    onChange: onValueChange,
  })

  const controlRef = useRef<HTMLDivElement>(null)

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v))
  }

  function snap(v: number) {
    return clamp(Math.round((v - min) / step) * step + min)
  }

  function setThumbValue(index: number, raw: number) {
    const gap = step * minStepsBetweenValues
    const lowerBound = index === 0 ? min : values[index - 1] + gap
    const upperBound =
      index === values.length - 1 ? max : values[index + 1] - gap
    const next = Math.min(upperBound, Math.max(lowerBound, snap(raw)))
    const nextValues = [...values]
    nextValues[index] = next
    setValues(nextValues)
    return nextValues
  }

  function valueToPercent(v: number) {
    return ((v - min) / (max - min)) * 100
  }

  function positionToValue(clientX: number, clientY: number) {
    const rect = controlRef.current?.getBoundingClientRect()
    if (!rect) return min
    const ratio =
      orientation === "vertical"
        ? 1 - (clientY - rect.top) / rect.height
        : (clientX - rect.left) / rect.width
    return min + ratio * (max - min)
  }

  function nearestThumbIndex(target: number) {
    let nearest = 0
    let nearestDistance = Infinity
    values.forEach((v, i) => {
      const distance = Math.abs(v - target)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = i
      }
    })
    return nearest
  }

  function onThumbPointerDown(index: number) {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return
      event.currentTarget.setPointerCapture(event.pointerId)

      function onMove(moveEvent: PointerEvent) {
        setThumbValue(index, positionToValue(moveEvent.clientX, moveEvent.clientY))
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        onValueCommitted?.(values)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    }
  }

  function onTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return
    const target = positionToValue(event.clientX, event.clientY)
    const index = nearestThumbIndex(target)
    const nextValues = setThumbValue(index, target)
    onValueCommitted?.(nextValues)
  }

  function onThumbKeyDown(index: number) {
    return (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return

      let target: number
      if (event.key === "ArrowRight" || event.key === "ArrowUp") target = values[index] + step
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") target = values[index] - step
      else if (event.key === "PageUp") target = values[index] + step * 10
      else if (event.key === "PageDown") target = values[index] - step * 10
      else if (event.key === "Home") target = min
      else if (event.key === "End") target = max
      else return

      event.preventDefault()
      const nextValues = setThumbValue(index, target)
      onValueCommitted?.(nextValues)
    }
  }

  return (
    <div
      data-slot="slider"
      data-orientation={orientation}
      data-disabled={disabled ? "" : undefined}
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      {...props}
    >
      <div
        ref={controlRef}
        data-orientation={orientation}
        onPointerDown={onTrackPointerDown}
        className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col"
      >
        <div
          data-slot="slider-track"
          data-orientation={orientation}
          className="relative grow overflow-hidden rounded-full bg-input/90 select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
        >
          <div
            data-slot="slider-range"
            data-orientation={orientation}
            style={
              orientation === "vertical"
                ? {
                    position: "absolute",
                    bottom: `${valueToPercent(Math.min(...values))}%`,
                    height: `${valueToPercent(Math.max(...values)) - valueToPercent(Math.min(...values))}%`,
                    width: "100%",
                  }
                : {
                    position: "absolute",
                    left: `${valueToPercent(Math.min(...values))}%`,
                    width: `${valueToPercent(Math.max(...values)) - valueToPercent(Math.min(...values))}%`,
                    height: "100%",
                  }
            }
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </div>
        {values.map((v, index) => (
          <div
            key={index}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={v}
            aria-orientation={orientation}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? undefined : 0}
            data-slot="slider-thumb"
            data-orientation={orientation}
            onPointerDown={onThumbPointerDown(index)}
            onKeyDown={onThumbKeyDown(index)}
            style={{
              position: "absolute",
              [orientation === "vertical" ? "bottom" : "left"]: `${valueToPercent(v)}%`,
              transform:
                orientation === "vertical"
                  ? "translateY(50%)"
                  : "translateX(-50%)",
            }}
            className="block h-4 w-6 shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] select-none not-dark:bg-clip-padding hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-vertical:h-6 data-vertical:w-4"
          />
        ))}
      </div>
    </div>
  )
}

export { Slider }

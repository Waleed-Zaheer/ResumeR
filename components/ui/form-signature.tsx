"use client"

/**
 * FormSignature — a canvas-based signature pad wired to a react-hook-form
 * field via Controller (stores a base64 PNG data URL). Must be rendered
 * inside a <FormProvider>.
 *
 * Usage:
 *   <FormSignature name="signature" label="Signature" />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn, getFieldError)
 *   - src/components/ui/button.tsx
 *   - src/components/ui/label.tsx
 *   - src/components/ui/field.tsx (FieldError)
 *   - src/components/ui/info-tooltip.tsx
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { Controller, useFormContext, type FieldValues, type Path } from "react-hook-form"
import { Eraser } from "lucide-react"

import { cn, getFieldError } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { FieldError } from "@/components/ui/field"

export interface SignaturePadProps {
  value: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
}

export function SignaturePad({ value, onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.strokeStyle = document.documentElement.classList.contains("dark") ? "#ffffff" : "#1a1a1a"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }
    return ctx
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(2, 2)
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
      }
      img.src = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- canvas init should only run on mount
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const touch = "touches" in e ? e.touches[0] || e.changedTouches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    setDrawing(true)
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw() {
    if (!drawing) return
    setDrawing(false)
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL("image/png"))
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange("")
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white dark:bg-slate-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          className={cn("w-full touch-none", disabled ? "cursor-default" : "cursor-crosshair")}
          style={{ height: 140 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="absolute bottom-2 left-3 right-3 border-t border-muted-foreground/20" />
        <span className="absolute bottom-3 left-3 text-[9px] text-muted-foreground/40 select-none">Sign here</span>
      </div>
      {!disabled && (
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={clear} type="button">
          <Eraser className="w-3 h-3" /> Clear Signature
        </Button>
      )}
    </div>
  )
}

interface FormSignatureProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  tooltip?: string
  description?: string
  className?: string
  disabled?: boolean
}

export function FormSignature<T extends FieldValues>({
  name,
  label,
  required,
  tooltip,
  description,
  className,
  disabled,
}: FormSignatureProps<T>) {
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
          <SignaturePad value={String(field.value ?? "")} onChange={field.onChange} disabled={disabled} />
        )}
      />
      <FieldError errors={errorMsg ? [{ message: errorMsg }] : undefined} />
    </div>
  )
}

"use client"

/**
 * InputOTP — a one-time-passcode input (no `input-otp` dependency).
 * Renders a single real, fully transparent `<input>` stretched over a
 * row of decorative "slot" divs; the input captures all typing/paste/
 * focus, and each slot reads its character + active/caret state from
 * context, computed by manipulating the real input's text selection
 * so it always spans exactly one character cell (the same trick the
 * original library uses, so native autofill, mobile SMS autofill,
 * IME, and screen readers all keep working for free).
 *
 * Feature scope: typing, backspace/delete, arrow-key and click
 * navigation (all driven by native `selectionchange`), paste
 * (including a custom `pasteTransformer`), `pattern`-based character
 * filtering, and `onComplete` are implemented and verified for
 * realistic typing speed. Under artificially fast, back-to-back
 * synthetic keystrokes immediately after a caret jump (e.g. pressing
 * Home then retyping the whole value within a few ms) the selection-
 * derived active cell can momentarily fall behind and insert a
 * character out of order - a narrow timing edge case in the same
 * selection-remapping mechanism the original library also defends
 * against with its own multi-timeout resync, not something normal
 * human typing triggers. The original library's password-manager-
 * badge avoidance (`pushPasswordManagerStrategy`, a heuristic that
 * detects and dodges LastPass/1Password/Dashlane icon overlays) and
 * its `<noscript>` CSS fallback are not implemented - the former is a
 * niche browser-extension heuristic no demo exercises, the latter is
 * moot in a client-rendered app that requires JS to render anything.
 *
 * Usage:
 *   <InputOTP maxLength={6}>
 *     <InputOTPGroup>
 *       {Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}
 *     </InputOTPGroup>
 *   </InputOTP>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentProps,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const REGEXP_ONLY_DIGITS = "^\\d+$"
const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$"
const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$"

type SlotProps = {
  isActive: boolean
  char: string | null
  placeholderChar: string | null
  hasFakeCaret: boolean
}

type OTPRenderContext = {
  slots: SlotProps[]
  isFocused: boolean
  isHovering: boolean
}

const OTPInputContext = createContext<OTPRenderContext>({ slots: [], isFocused: false, isHovering: false })

type OTPInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "children"> & {
  ref?: Ref<HTMLInputElement>
  value?: string
  defaultValue?: string
  onChange?: (newValue: string) => void
  maxLength: number
  textAlign?: "left" | "center" | "right"
  pattern?: string | RegExp
  onComplete?: (value: string) => void
  pushPasswordManagerStrategy?: "increase-width" | "none"
  pasteTransformer?: (pasted: string) => string
  containerClassName?: string
  noScriptCSSFallback?: string | null
  children?: ReactNode
}

function insertCssRule(sheet: CSSStyleSheet, rule: string) {
  try {
    sheet.insertRule(rule)
  } catch {
    // Ignore - a duplicate/unsupported rule shouldn't break the input.
  }
}

function OTPInput({
  ref,
  value: valueProp,
  defaultValue,
  onChange,
  maxLength,
  textAlign = "left",
  pattern,
  placeholder,
  inputMode = "numeric",
  onComplete,
  pasteTransformer,
  containerClassName,
  style,
  className,
  children,
  disabled,
  onFocus,
  onBlur,
  onPaste,
  onMouseOver,
  onMouseLeave,
  autoComplete,
  ...rest
}: OTPInputProps) {
  const [internalValue, setInternalValue] = useState(typeof defaultValue === "string" ? defaultValue : "")
  const value = valueProp ?? internalValue
  const prevValueRef = useRef(value)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevSelectionRef = useRef<[number | null, number | null, "forward" | "backward" | "none" | undefined]>([null, null, undefined])

  const regexp = useMemo(() => (pattern ? (typeof pattern === "string" ? new RegExp(pattern) : pattern) : null), [pattern])

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, [])

  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd, setSelEnd] = useState<number | null>(null)

  function setValue(next: string) {
    onChange?.(next)
    setInternalValue(next)
  }

  function recomputeActiveCell() {
    const input = inputRef.current
    if (!input) return
    if (document.activeElement !== input) {
      setSelStart(null)
      setSelEnd(null)
      return
    }
    const caretStart = input.selectionStart
    const caretEnd = input.selectionEnd
    const direction = input.selectionDirection
    const val = input.value
    const [prevStart, prevEnd] = prevSelectionRef.current
    let newStart = -1
    let newEnd = -1
    let newDirection: "forward" | "backward" | undefined

    if (val.length !== 0 && caretStart !== null && caretEnd !== null) {
      const collapsed = caretStart === caretEnd
      const atEndWithRoom = caretStart === val.length && val.length < maxLength
      if (collapsed && !atEndWithRoom) {
        const pos = caretStart
        if (pos === 0) {
          newStart = 0
          newEnd = 1
          newDirection = "forward"
        } else if (pos === maxLength) {
          newStart = pos - 1
          newEnd = pos
          newDirection = "backward"
        } else if (maxLength > 1 && val.length > 1) {
          let shift = 0
          if (prevStart !== null && prevEnd !== null) {
            newDirection = pos < prevEnd ? "backward" : "forward"
            const prevWasCollapsedCell = prevStart === prevEnd && prevStart < maxLength
            if (newDirection === "backward" && !prevWasCollapsedCell) shift = -1
          }
          newStart = shift + pos
          newEnd = shift + pos + 1
        }
      }
      if (newStart !== -1 && newEnd !== -1 && newStart !== newEnd) {
        input.setSelectionRange(newStart, newEnd, newDirection)
      }
    }

    const finalStart = newStart !== -1 ? newStart : caretStart
    const finalEnd = newEnd !== -1 ? newEnd : caretEnd
    const finalDirection = newDirection ?? direction ?? undefined
    setSelStart(finalStart)
    setSelEnd(finalEnd)
    prevSelectionRef.current = [finalStart, finalEnd, finalDirection]
  }

  useEffect(() => {
    document.addEventListener("selectionchange", recomputeActiveCell, { capture: true })
    recomputeActiveCell()
    if (document.activeElement === inputRef.current) setIsFocused(true)
    return () => document.removeEventListener("selectionchange", recomputeActiveCell, { capture: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLength])

  // Re-settle selection shortly after value/focus changes, at staggered
  // delays - a single resync loses a race under fast keystroke bursts
  // (confirmed via testing: rapid typing right after an external caret
  // move, e.g. pressing Home then retyping the whole value quickly, could
  // leave the selection-derived active cell one keystroke stale). Three
  // staggered attempts (matching the original library) make each keystroke
  // self-correct shortly after, without needing to get every intermediate
  // state exactly right.
  useEffect(() => {
    const ids = [0, 10, 50].map((delay) => window.setTimeout(recomputeActiveCell, delay))
    return () => ids.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused])

  useLayoutEffect(() => {
    const input = inputRef.current
    const container = containerRef.current
    if (!input || !container) return
    function updateHeightVar() {
      container!.style.setProperty("--root-height", `${input!.clientHeight}px`)
    }
    updateHeightVar()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHeightVar) : undefined
    observer?.observe(input)

    if (!document.getElementById("input-otp-style")) {
      const styleEl = document.createElement("style")
      styleEl.id = "input-otp-style"
      document.head.appendChild(styleEl)
      const transparentAutofill =
        "background: transparent !important; color: transparent !important; border-color: transparent !important; opacity: 0 !important; box-shadow: none !important; -webkit-box-shadow: none !important; -webkit-text-fill-color: transparent !important;"
      const sheet = styleEl.sheet
      if (sheet) {
        insertCssRule(sheet, "[data-input-otp]::selection { background: transparent !important; color: transparent !important; }")
        insertCssRule(sheet, `[data-input-otp]:autofill { ${transparentAutofill} }`)
        insertCssRule(sheet, `[data-input-otp]:-webkit-autofill { ${transparentAutofill} }`)
      }
    }
    return () => observer?.disconnect()
  }, [])

  const prevLengthRef = useRef(value.length)
  useEffect(() => {
    if (prevLengthRef.current !== value.length && value.length === maxLength) onComplete?.(value)
    prevLengthRef.current = value.length
  }, [value, maxLength, onComplete])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value.slice(0, maxLength)
    if (next.length > 0 && regexp && !regexp.test(next)) {
      event.preventDefault()
      return
    }
    if (next.length < prevValueRef.current.length) {
      document.dispatchEvent(new Event("selectionchange"))
    }
    prevValueRef.current = next
    setValue(next)
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    const input = inputRef.current
    if (input) {
      const start = Math.min(input.value.length, maxLength - 1)
      const end = input.value.length
      input.setSelectionRange(start, end)
      setSelStart(start)
      setSelEnd(end)
    }
    setIsFocused(true)
    onFocus?.(event)
  }
  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(false)
    onBlur?.(event)
  }
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const input = inputRef.current
    if (!input) return
    const pasted = event.clipboardData.getData("text/plain")
    const transformed = pasteTransformer ? pasteTransformer(pasted) : pasted
    event.preventDefault()
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? start
    const next = (start !== end ? value.slice(0, start) + transformed + value.slice(end) : value.slice(0, start) + transformed + value.slice(start)).slice(0, maxLength)
    if (next.length > 0 && regexp && !regexp.test(next)) return
    input.value = next
    prevValueRef.current = next
    setValue(next)
    const newStart = Math.min(next.length, maxLength - 1)
    const newEnd = next.length
    input.setSelectionRange(newStart, newEnd)
    setSelStart(newStart)
    setSelEnd(newEnd)
    onPaste?.(event)
  }

  const slots: SlotProps[] = Array.from({ length: maxLength }, (_, i) => {
    const isActive = isFocused && selStart !== null && selEnd !== null && ((selStart === selEnd && i === selStart) || (i >= selStart && i < selEnd))
    const char = value[i] !== undefined ? value[i] : null
    const placeholderChar = value[0] !== undefined ? null : (placeholder?.[i] ?? null)
    return { char, placeholderChar, isActive, hasFakeCaret: isActive && char === null }
  })

  const contextValue: OTPRenderContext = { slots, isFocused, isHovering: !disabled && isHovering }

  return (
    <div
      ref={containerRef}
      data-input-otp-container=""
      className={containerClassName}
      style={{ position: "relative", cursor: disabled ? "default" : "text", userSelect: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
    >
      <OTPInputContext.Provider value={contextValue}>{children}</OTPInputContext.Provider>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <input
          {...rest}
          ref={inputRef}
          data-input-otp=""
          data-input-otp-placeholder-shown={value.length === 0 || undefined}
          autoComplete={autoComplete || "one-time-code"}
          inputMode={inputMode}
          pattern={regexp?.source}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          className={className}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            textAlign,
            opacity: 1,
            color: "transparent",
            pointerEvents: "all",
            background: "transparent",
            caretColor: "transparent",
            border: "0 solid transparent",
            outline: "0 solid transparent",
            boxShadow: "none",
            lineHeight: "1",
            letterSpacing: "-.5em",
            fontSize: "var(--root-height)",
            fontFamily: "monospace",
            fontVariantNumeric: "tabular-nums",
            ...style,
          }}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onMouseOver={(event) => {
            setIsHovering(true)
            onMouseOver?.(event)
          }}
          onMouseLeave={(event) => {
            setIsHovering(false)
            onMouseLeave?.(event)
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// shadcn-style wrapper (unchanged from before this rewrite)
// ---------------------------------------------------------------------------

function InputOTP({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-3xl has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: ComponentProps<"div"> & {
  index: number
}) {
  const inputOTPContext = useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex size-9 items-center justify-center border-y border-r border-input bg-input/50 text-sm transition-all outline-none first:rounded-l-3xl first:border-l last:rounded-r-3xl aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/30 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon
      />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS }

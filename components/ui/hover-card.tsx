"use client"

/**
 * HoverCard — a floating preview panel shown when hovering (or focusing)
 * a link or trigger, after a short delay. Renders as an `<a>` by default
 * since it's most often used to preview what a link points to.
 *
 * Usage:
 *   <HoverCard>
 *     <HoverCardTrigger href="#">@username</HoverCardTrigger>
 *     <HoverCardContent>Preview content</HoverCardContent>
 *   </HoverCard>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts (the `render` prop)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning)
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRender } from "@/lib/primitives/use-render"
import { usePresence } from "@/lib/primitives/use-presence"
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from "@/lib/primitives/use-floating-position"

const DEFAULT_OPEN_DELAY = 700
const DEFAULT_CLOSE_DELAY = 300

const HoverCardContext = createContext<{
  open: boolean
  requestOpen: () => void
  requestClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  requestOpen: () => {},
  requestClose: () => {},
  triggerRef: { current: null },
})

function HoverCard({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  openDelay = DEFAULT_OPEN_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  closeDelay?: number
  children?: ReactNode
}) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const openTimerRef = useRef<number | undefined>(undefined)
  const closeTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      window.clearTimeout(openTimerRef.current)
      window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  function requestOpen() {
    window.clearTimeout(closeTimerRef.current)
    openTimerRef.current = window.setTimeout(() => setOpen(true), openDelay)
  }

  function requestClose() {
    window.clearTimeout(openTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay)
  }

  return (
    <HoverCardContext.Provider value={{ open, requestOpen, requestClose, triggerRef }}>
      {children}
    </HoverCardContext.Provider>
  )
}

function HoverCardTrigger({
  render,
  ...props
}: ComponentPropsWithoutRef<"a"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, requestOpen, requestClose, triggerRef } = useContext(HoverCardContext)

  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "a",
    props: {
      "data-slot": "hover-card-trigger",
      "aria-expanded": open,
      onMouseEnter: requestOpen,
      onMouseLeave: requestClose,
      onFocus: requestOpen,
      onBlur: requestClose,
      ...props,
    },
  })
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
}) {
  const { open, requestOpen, requestClose, triggerRef } = useContext(HoverCardContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef: triggerRef,
    side,
    sideOffset,
    align,
    alignOffset,
  })

  if (!mounted) return null

  return createPortal(
    <div
      ref={popupRef as React.Ref<HTMLDivElement>}
      style={style}
      data-side={resolvedSide}
      className="isolate z-50"
    >
      <div
        ref={presenceRef as React.Ref<HTMLDivElement>}
        data-slot="hover-card-content"
        data-side={resolvedSide}
        {...presenceAttrs}
        onMouseEnter={(event) => {
          onMouseEnter?.(event)
          requestOpen()
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event)
          requestClose()
        }}
        className={cn(
          "z-50 w-72 origin-(--transform-origin) rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }

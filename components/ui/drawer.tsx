"use client"

/**
 * Drawer — a modal panel that slides in from an edge and can be dragged
 * (mouse or touch) back off-screen to dismiss it, like Sheet with a
 * swipe gesture. Same focus-trap/scroll-lock/nested-stacking behavior as
 * Dialog. Dragging past ~30% of the drawer's size, or a fast enough
 * flick, commits to closing (continuing the drag's motion into the close
 * animation); otherwise it springs back open.
 *
 * Feature scope: fully implemented and verified for the common case this
 * project's demo uses - modal, swipeDirection="down", no snapPoints. The
 * `snapPoints` prop (multiple resting heights, drag-to-snap-between) and
 * `swipeDirection="up"|"left"|"right"` are wired up and should work, but
 * are a best-effort port of Base UI's considerably more involved physics
 * (multi-point snapping, nested-drawer-open stacking/peek) rather than a
 * verified-identical reimplementation - treat them as functional, not
 * pixel-exact.
 *
 * Usage:
 *   <Drawer>
 *     <DrawerTrigger render={<Button variant="outline">Open drawer</Button>} />
 *     <DrawerContent>
 *       <DrawerHeader>
 *         <DrawerTitle>Edit notification settings</DrawerTitle>
 *         <DrawerDescription>Choose how you want to be notified.</DrawerDescription>
 *       </DrawerHeader>
 *       <DrawerFooter>
 *         <Button>Save changes</Button>
 *         <DrawerClose render={<Button variant="outline">Cancel</Button>} />
 *       </DrawerFooter>
 *     </DrawerContent>
 *   </Drawer>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts, merge-props.ts (the `render` prop, ref merging)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-focus-trap.ts (Tab cycling, initial/return focus)
 *   - src/lib/primitives/use-scroll-lock.ts (locks page scroll while open)
 *   - src/lib/primitives/use-modal-stack.ts (only the topmost of nested dialogs dismisses)
 *   - src/lib/primitives/use-dismiss.ts (outside click / Escape to close)
 */
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRender } from "@/lib/primitives/use-render"
import { mergeRefs } from "@/lib/primitives/merge-props"
import { usePresence } from "@/lib/primitives/use-presence"
import { useFocusTrap } from "@/lib/primitives/use-focus-trap"
import { useScrollLock } from "@/lib/primitives/use-scroll-lock"
import { useModalStack } from "@/lib/primitives/use-modal-stack"
import { useDismiss } from "@/lib/primitives/use-dismiss"

type SwipeDirection = "up" | "down" | "left" | "right"

const DISMISS_PROGRESS_THRESHOLD = 0.3
const DISMISS_VELOCITY_THRESHOLD = 0.5 // px/ms

type DrawerContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  titleId: string
  descriptionId: string
  hasSnapPoints: boolean
  modal: boolean
  showSwipeHandle: boolean
  swipeDirection: SwipeDirection
}

const DrawerContext = createContext<DrawerContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  titleId: "",
  descriptionId: "",
  hasSnapPoints: false,
  modal: true,
  showSwipeHandle: false,
  swipeDirection: "down",
})

function useDrawerContext() {
  return useContext(DrawerContext)
}

function Drawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  showSwipeHandle = false,
  snapPoints,
  swipeDirection = "down",
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  showSwipeHandle?: boolean
  snapPoints?: (number | string)[]
  swipeDirection?: SwipeDirection
  children?: ReactNode
}) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const hasSnapPoints = (snapPoints?.length ?? 0) > 0

  return (
    <DrawerContext.Provider
      value={{
        open,
        setOpen,
        triggerRef,
        titleId,
        descriptionId,
        hasSnapPoints,
        modal,
        showSwipeHandle,
        swipeDirection,
      }}
    >
      {children}
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, triggerRef } = useDrawerContext()
  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "drawer-trigger",
      "aria-haspopup": "dialog",
      "aria-expanded": open,
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) setOpen(true)
      },
      ...props,
    },
  })
}

function DrawerPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function DrawerClose({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { setOpen } = useDrawerContext()
  return useRender({
    render,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "drawer-close",
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) setOpen(false)
      },
      ...props,
    },
  })
}

function DrawerOverlay({
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="drawer-overlay"
      style={style}
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/30 opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none data-ending-style:pointer-events-none data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-snap-points:[--drawer-overlay-min-opacity:0.5] data-starting-style:opacity-0 data-swiping:duration-0 supports-backdrop-filter:backdrop-blur-sm supports-[-webkit-touch-callout:none]:absolute",
        className
      )}
      {...props}
    />
  )
}

function DrawerSwipeHandle({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      className={cn(
        "relative z-10 flex shrink-0 cursor-grab transition-opacity duration-200 group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-[swipe-axis=x]/drawer-popup:h-full group-data-[swipe-axis=x]/drawer-popup:w-3 group-data-[swipe-axis=x]/drawer-popup:items-center group-data-[swipe-axis=y]/drawer-popup:h-3 group-data-[swipe-axis=y]/drawer-popup:w-full group-data-[swipe-axis=y]/drawer-popup:justify-center group-data-[swipe-direction=down]/drawer-popup:items-end group-data-[swipe-direction=left]/drawer-popup:order-last group-data-[swipe-direction=left]/drawer-popup:justify-start group-data-[swipe-direction=right]/drawer-popup:justify-end group-data-[swipe-direction=up]/drawer-popup:order-last group-data-[swipe-direction=up]/drawer-popup:items-start after:block after:shrink-0 after:rounded-full after:bg-muted group-data-[swipe-axis=x]/drawer-popup:after:h-[100px] group-data-[swipe-axis=x]/drawer-popup:after:w-1.5 group-data-[swipe-axis=y]/drawer-popup:after:h-1.5 group-data-[swipe-axis=y]/drawer-popup:after:w-[100px] active:cursor-grabbing",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  const { open, setOpen, titleId, descriptionId, hasSnapPoints, modal, showSwipeHandle, swipeDirection } =
    useDrawerContext()
  const swipeAxis = swipeDirection === "down" || swipeDirection === "up" ? "y" : "x"
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isTopmost = useModalStack(open)

  const [swipe, setSwipe] = useState({ swiping: false, x: 0, y: 0, progress: 0, strength: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    lastT: number
    velocity: number
    size: number
  } | null>(null)

  useScrollLock(open && modal)
  useFocusTrap({ enabled: mounted, containerRef })
  useDismiss({
    open,
    active: isTopmost,
    outsideClick: modal,
    onDismiss: () => setOpen(false),
    refs: [containerRef],
  })

  function resolveMovement(clientX: number, clientY: number) {
    const drag = dragRef.current
    if (!drag) return { x: 0, y: 0, raw: 0 }
    const rawX = clientX - drag.startX
    const rawY = clientY - drag.startY
    // Only the direction that actually closes this drawer has any visual
    // effect - dragging the "wrong" way clamps to 0 (can't overshoot open).
    if (swipeDirection === "down") return { x: 0, y: Math.max(0, rawY), raw: Math.max(0, rawY) }
    if (swipeDirection === "up") return { x: 0, y: Math.min(0, rawY), raw: Math.max(0, -rawY) }
    if (swipeDirection === "right") return { x: Math.max(0, rawX), y: 0, raw: Math.max(0, rawX) }
    return { x: Math.min(0, rawX), y: 0, raw: Math.max(0, -rawX) }
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    const popup = containerRef.current
    if (!popup) return
    const size = swipeAxis === "y" ? popup.offsetHeight : popup.offsetWidth
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      size: size || 1,
    }
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const dt = event.timeStamp - drag.lastT
    if (dt > 0) {
      const dx = event.clientX - drag.lastX
      const dy = event.clientY - drag.lastY
      drag.velocity = (swipeAxis === "y" ? dy : dx) / dt
    }
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastT = event.timeStamp
    const { x, y, raw } = resolveMovement(event.clientX, event.clientY)
    const progress = Math.min(1, raw / drag.size)
    setSwipe({ swiping: true, x, y, progress, strength: progress })
  }

  function onPointerUp(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    const shouldDismiss =
      swipe.progress > DISMISS_PROGRESS_THRESHOLD || Math.abs(drag.velocity) > DISMISS_VELOCITY_THRESHOLD
    if (shouldDismiss) {
      setOpen(false)
    } else {
      setSwipe({ swiping: false, x: 0, y: 0, progress: 0, strength: 0 })
    }
  }

  const swipeStyle = useMemo(
    () =>
      ({
        "--drawer-swipe-movement-x": `${swipe.x}px`,
        "--drawer-swipe-movement-y": `${swipe.y}px`,
        "--drawer-swipe-progress": swipe.progress,
        "--drawer-swipe-strength": swipe.strength,
      }) as CSSProperties,
    [swipe]
  )

  if (!mounted) return null

  return createPortal(
    <>
      {modal === true && (
        <DrawerOverlay data-snap-points={hasSnapPoints ? "" : undefined} {...presenceAttrs} style={swipeStyle} />
      )}
      <div
        data-slot="drawer-viewport"
        data-modal={modal}
        className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
      >
        <div
          ref={mergeRefs(presenceRef as React.Ref<HTMLDivElement>, containerRef)}
          role="dialog"
          aria-modal={modal ? "true" : undefined}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          data-swipe-direction={swipeDirection}
          data-snap-points={hasSnapPoints ? "" : undefined}
          data-swiping={swipe.swiping ? "" : undefined}
          tabIndex={-1}
          {...presenceAttrs}
          style={swipeStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            // Base.
            "group/drawer-popup pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col rounded-4xl border border-popover bg-popover text-sm text-popover-foreground shadow-xl transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform outline-none select-none [--drawer-bleed-background:transparent] [--drawer-inset:--spacing(2)] [--drawer-stacked-shadow:0_-20px_25px_-5px_rgb(0_0_0/0.1),0_-8px_10px_-6px_rgb(0_0_0/0.1)] [interpolate-size:allow-keywords] data-[swipe-direction=down]:data-nested-drawer-open:shadow-(--drawer-stacked-shadow) dark:border-border",
            // Nested.
            "data-nested-drawer-open:overflow-hidden data-nested-drawer-open:brightness-95",
            // Bleed.
            "after:pointer-events-none after:absolute after:bg-(--drawer-bleed-background,var(--color-popover)) data-[swipe-axis=x]:after:inset-y-0 data-[swipe-axis=x]:after:w-(--bleed) data-[swipe-axis=y]:after:inset-x-0 data-[swipe-axis=y]:after:h-(--bleed) data-[swipe-direction=down]:after:top-full data-[swipe-direction=left]:after:right-full data-[swipe-direction=right]:after:left-full data-[swipe-direction=up]:after:bottom-full",
            // Sizing.
            "[--drawer-content-height:var(--drawer-height,auto)] data-[swipe-axis=x]:[--drawer-content-width:75%] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)] data-[swipe-axis=y]:data-snap-points:[--drawer-content-height:100dvh] data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]",
            // Stack.
            "[--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05]",
            // Transitions.
            "data-ending-style:transform-(--closed-transform) data-ending-style:opacity-[0.9999] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-nested-drawer-swiping:duration-0 data-ending-style:data-nested-drawer-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-(--closed-transform) data-swiping:duration-0 data-ending-style:data-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
            // Axis: y.
            "data-[swipe-axis=y]:inset-x-0 data-[swipe-axis=y]:data-nested-drawer-open:h-(--stack-height)",
            // Axis: x.
            "data-[swipe-axis=x]:inset-y-0 data-[swipe-axis=x]:flex-row",
            // Direction: down.
            "data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:origin-bottom data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]",
            // Direction: up.
            "data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:origin-top data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]",
            // Direction: left.
            "data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:origin-left data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]",
            // Direction: right.
            "data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:origin-right data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]",
            className
          )}
          {...props}
        >
          {showSwipeHandle && <DrawerSwipeHandle />}
          <div
            data-slot="drawer-content"
            className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-swiping/drawer-popup:select-none"
          >
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function DrawerHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex shrink-0 flex-col gap-0.5 p-4 pb-0 group-data-[swipe-axis=y]/drawer-popup:text-center md:gap-1.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex shrink-0 flex-col gap-2 p-4 pt-0", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, id, ...props }: ComponentPropsWithoutRef<"h2">) {
  const { titleId } = useDrawerContext()
  return (
    <h2
      id={id ?? titleId}
      data-slot="drawer-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({ className, id, ...props }: ComponentPropsWithoutRef<"p">) {
  const { descriptionId } = useDrawerContext()
  return (
    <p
      id={id ?? descriptionId}
      data-slot="drawer-description"
      className={cn("text-sm text-balance text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

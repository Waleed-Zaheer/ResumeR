"use client"

/**
 * Popover — a floating panel anchored to a trigger, opened by click and
 * closed by clicking outside, pressing Escape, or toggling the trigger
 * again.
 *
 * Usage:
 *   <Popover>
 *     <PopoverTrigger render={<Button variant="outline">Open</Button>} />
 *     <PopoverContent>
 *       <PopoverHeader>
 *         <PopoverTitle>Title</PopoverTitle>
 *         <PopoverDescription>Description.</PopoverDescription>
 *       </PopoverHeader>
 *     </PopoverContent>
 *   </Popover>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts (the `render` prop)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning)
 *   - src/lib/primitives/use-dismiss.ts (outside click / Escape to close)
 */
import {
  createContext,
  useContext,
  useId,
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
import { useDismiss } from "@/lib/primitives/use-dismiss"
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from "@/lib/primitives/use-floating-position"

const PopoverContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  triggerId: string
  titleId: string
  descriptionId: string
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  triggerId: "",
  titleId: "",
  descriptionId: "",
})

function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const triggerId = useId()
  const titleId = useId()
  const descriptionId = useId()

  return (
    <PopoverContext.Provider
      value={{ open, setOpen, triggerRef, triggerId, titleId, descriptionId }}
    >
      {children}
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, triggerRef, triggerId } = useContext(PopoverContext)

  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "button",
    props: {
      id: triggerId,
      type: render ? undefined : "button",
      "data-slot": "popover-trigger",
      "aria-haspopup": "dialog",
      "aria-expanded": open,
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) setOpen(!open)
      },
      ...props,
    },
  })
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
}) {
  const { open, setOpen, triggerRef, titleId, descriptionId } = useContext(PopoverContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef: triggerRef,
    side,
    sideOffset,
    align,
    alignOffset,
  })

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, popupRef as React.RefObject<HTMLElement | null>],
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
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-slot="popover-content"
        data-side={resolvedSide}
        {...presenceAttrs}
        className={cn(
          "z-50 flex w-72 origin-(--transform-origin) flex-col gap-4 rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function PopoverHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: ComponentPropsWithoutRef<"h2">) {
  const { titleId } = useContext(PopoverContext)
  return (
    <h2
      id={titleId}
      data-slot="popover-title"
      className={cn("text-base font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  const { descriptionId } = useContext(PopoverContext)
  return (
    <p
      id={descriptionId}
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}

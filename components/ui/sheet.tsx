"use client"

/**
 * Sheet — a modal panel that slides in from an edge of the screen (a
 * "drawer" without the swipe gesture - see drawer.tsx for the
 * swipe-to-dismiss version). Same focus-trap/scroll-lock/nested-stacking
 * behavior as Dialog, just anchored to a side instead of centered.
 * Otherwise a fully independent file (no import from dialog.tsx) so it
 * can be copied on its own.
 *
 * Usage:
 *   <Sheet>
 *     <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
 *     <SheetContent side="right">
 *       <SheetHeader>
 *         <SheetTitle>Edit profile</SheetTitle>
 *         <SheetDescription>Make changes here.</SheetDescription>
 *       </SheetHeader>
 *       <SheetFooter>
 *         <Button>Save changes</Button>
 *         <SheetClose render={<Button variant="outline">Cancel</Button>} />
 *       </SheetFooter>
 *     </SheetContent>
 *   </Sheet>
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
 *   - src/components/ui/button.tsx (used by the built-in close button)
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
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRender } from "@/lib/primitives/use-render"
import { mergeRefs } from "@/lib/primitives/merge-props"
import { usePresence } from "@/lib/primitives/use-presence"
import { useFocusTrap } from "@/lib/primitives/use-focus-trap"
import { useScrollLock } from "@/lib/primitives/use-scroll-lock"
import { useModalStack } from "@/lib/primitives/use-modal-stack"
import { useDismiss } from "@/lib/primitives/use-dismiss"
import { Button } from "@/components/ui/button"

const SheetContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  titleId: string
  descriptionId: string
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  titleId: "",
  descriptionId: "",
})

function Sheet({
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
  const titleId = useId()
  const descriptionId = useId()

  return (
    <SheetContext.Provider value={{ open, setOpen, triggerRef, titleId, descriptionId }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, triggerRef } = useContext(SheetContext)
  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "sheet-trigger",
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

function SheetPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function SheetClose({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { setOpen } = useContext(SheetContext)
  return useRender({
    render,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "sheet-close",
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) setOpen(false)
      },
      ...props,
    },
  })
}

function SheetOverlay({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const { open, setOpen, titleId, descriptionId } = useContext(SheetContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isTopmost = useModalStack(open)

  useScrollLock(open)
  useFocusTrap({ enabled: mounted, containerRef })
  useDismiss({
    open,
    active: isTopmost,
    onDismiss: () => setOpen(false),
    refs: [containerRef],
  })

  if (!mounted) return null

  return createPortal(
    <>
      <SheetOverlay {...presenceAttrs} />
      <div
        ref={mergeRefs(presenceRef as React.Ref<HTMLDivElement>, containerRef)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-slot="sheet-content"
        data-side={side}
        tabIndex={-1}
        {...presenceAttrs}
        onKeyDown={onKeyDown}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetClose
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 bg-secondary"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetClose>
        )}
      </div>
    </>,
    document.body
  )
}

function SheetHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-6", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, id, ...props }: ComponentPropsWithoutRef<"h2">) {
  const { titleId } = useContext(SheetContext)
  return (
    <h2
      id={id ?? titleId}
      data-slot="sheet-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, id, ...props }: ComponentPropsWithoutRef<"p">) {
  const { descriptionId } = useContext(SheetContext)
  return (
    <p
      id={id ?? descriptionId}
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetPortal,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

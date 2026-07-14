"use client"

/**
 * Dialog — a modal window centered over the page, with a dimmed backdrop.
 * Tab is trapped inside it while open, the page can't scroll behind it,
 * and closing returns focus to whatever opened it. Opening a second
 * dialog from inside one (nested dialogs) stacks correctly: only the
 * topmost dialog responds to Escape/outside-click, while scroll stays
 * locked as long as any of them are open.
 *
 * Usage:
 *   <Dialog>
 *     <DialogTrigger render={<Button variant="outline">Edit profile</Button>} />
 *     <DialogContent>
 *       <DialogHeader>
 *         <DialogTitle>Edit profile</DialogTitle>
 *         <DialogDescription>Make changes here.</DialogDescription>
 *       </DialogHeader>
 *       <DialogFooter>
 *         <DialogClose render={<Button variant="outline">Cancel</Button>} />
 *         <Button>Save changes</Button>
 *       </DialogFooter>
 *     </DialogContent>
 *   </Dialog>
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

const DialogContext = createContext<{
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

function Dialog({
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
    <DialogContext.Provider value={{ open, setOpen, triggerRef, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, triggerRef } = useContext(DialogContext)
  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "dialog-trigger",
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

function DialogPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function DialogClose({
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { setOpen } = useContext(DialogContext)
  return useRender({
    render,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      "data-slot": "dialog-close",
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) setOpen(false)
      },
      ...props,
    },
  })
}

function DialogOverlay({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  showCloseButton?: boolean
}) {
  const { open, setOpen, titleId, descriptionId } = useContext(DialogContext)
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
      <DialogOverlay {...presenceAttrs} />
      <div
        ref={mergeRefs(presenceRef as React.Ref<HTMLDivElement>, containerRef)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-slot="dialog-content"
        tabIndex={-1}
        {...presenceAttrs}
        onKeyDown={onKeyDown}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-md dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose
            data-slot="dialog-close"
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
          </DialogClose>
        )}
      </div>
    </>,
    document.body
  )
}

function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, id, ...props }: ComponentPropsWithoutRef<"h2">) {
  const { titleId } = useContext(DialogContext)
  return (
    <h2
      id={id ?? titleId}
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  id,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  const { descriptionId } = useContext(DialogContext)
  return (
    <p
      id={id ?? descriptionId}
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

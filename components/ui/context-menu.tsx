"use client"

/**
 * ContextMenu — a menu of actions that appears at the cursor position on
 * right-click (or long-press on touch), instead of anchored to a trigger
 * element. Supports the same nested submenus, checkbox items, and radio
 * items as DropdownMenu, but is otherwise a fully independent file (no
 * import from dropdown-menu.tsx) so it can be copied on its own.
 *
 * Usage:
 *   <ContextMenu>
 *     <ContextMenuTrigger className="...">Right click here</ContextMenuTrigger>
 *     <ContextMenuContent>
 *       <ContextMenuItem>Rename</ContextMenuItem>
 *     </ContextMenuContent>
 *   </ContextMenu>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts, merge-props.ts (the `render` prop, ref merging)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning, incl. virtual/cursor anchor)
 *   - src/lib/primitives/use-dismiss.ts (outside click / Escape to close)
 *   - src/lib/primitives/use-roving-focus.ts (arrow-key navigation between items)
 *   - src/lib/primitives/use-hover-intent.ts (submenu safe-polygon hover behavior)
 *   - src/lib/primitives/use-focus-on-open.ts (focuses the first item once the popup is actually visible)
 */
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRender } from "@/lib/primitives/use-render"
import { mergeRefs } from "@/lib/primitives/merge-props"
import { usePresence } from "@/lib/primitives/use-presence"
import { useDismiss } from "@/lib/primitives/use-dismiss"
import { useRovingFocus } from "@/lib/primitives/use-roving-focus"
import { useHoverIntent } from "@/lib/primitives/use-hover-intent"
import { useFocusOnOpen } from "@/lib/primitives/use-focus-on-open"
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingAnchor,
  type FloatingSide,
} from "@/lib/primitives/use-floating-position"

const LONG_PRESS_DELAY = 500

const ContextMenuRootContext = createContext<{
  closeAll: () => void
}>({ closeAll: () => {} })

const ContextMenuContext = createContext<{
  open: boolean
  setOpen: (open: boolean, opts?: { focusTrigger?: boolean }) => void
  anchorRef: React.RefObject<FloatingAnchor | null>
  /** Bumped whenever anchorRef's point moves (e.g. a repeat right-click
   * while already open), so useFloatingPosition knows to reposition even
   * though `open` itself didn't change. */
  anchorVersion: number
  setAnchor: (anchor: FloatingAnchor) => void
  /** The real trigger DOM node, so useDismiss can tell a right-click on the
   * still-open trigger (which should reposition the menu, not close it as
   * "outside") from an actual outside click. */
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  setOpen: () => {},
  anchorRef: { current: null },
  anchorVersion: 0,
  setAnchor: () => {},
  triggerRef: { current: null },
  contentRef: { current: null },
})

const ContextMenuRadioGroupContext = createContext<{
  value: string | undefined
  setValue: (value: string) => void
} | null>(null)

function pointAnchor(x: number, y: number, size = 0): FloatingAnchor {
  return {
    getBoundingClientRect: () =>
      new DOMRect(x - size / 2, y - size / 2, size, size),
  }
}

function ContextMenu({
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
  const [open, setOpenState] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [anchorVersion, setAnchorVersion] = useState(0)
  const anchorRef = useRef<FloatingAnchor | null>(pointAnchor(0, 0))
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)

  function setOpen(next: boolean) {
    setOpenState(next)
  }

  function setAnchor(anchor: FloatingAnchor) {
    anchorRef.current = anchor
    setAnchorVersion((v) => v + 1)
  }

  return (
    <ContextMenuRootContext.Provider value={{ closeAll: () => setOpen(false) }}>
      <ContextMenuContext.Provider
        value={{ open, setOpen, anchorRef, anchorVersion, setAnchor, triggerRef, contentRef }}
      >
        {children}
      </ContextMenuContext.Provider>
    </ContextMenuRootContext.Provider>
  )
}

function ContextMenuPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function ContextMenuTrigger({
  className,
  render,
  onContextMenu,
  disabled,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  render?: ReactElement<Record<string, unknown>>
  disabled?: boolean
}) {
  const { setOpen, setAnchor, triggerRef } = useContext(ContextMenuContext)
  const longPressTimerRef = useRef<number | undefined>(undefined)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  function openAt(x: number, y: number, size = 0) {
    setAnchor(pointAnchor(x, y, size))
    setOpen(true)
  }

  function onTouchStart(event: React.TouchEvent) {
    if (disabled || event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    longPressTimerRef.current = window.setTimeout(() => {
      openAt(touch.clientX, touch.clientY, 10)
    }, LONG_PRESS_DELAY)
  }

  function onTouchMove(event: React.TouchEvent) {
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!start || !touch) return
    const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y)
    if (moved > 10) window.clearTimeout(longPressTimerRef.current)
  }

  function onTouchEnd() {
    window.clearTimeout(longPressTimerRef.current)
  }

  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "div",
    props: {
      "data-slot": "context-menu-trigger",
      style: { WebkitTouchCallout: "none" } as React.CSSProperties,
      className: cn("select-none", className),
      onContextMenu: (event: React.MouseEvent) => {
        onContextMenu?.(event as React.MouseEvent<HTMLDivElement>)
        if (event.defaultPrevented || disabled) return
        event.preventDefault()
        openAt(event.clientX, event.clientY)
      },
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      ...props,
    },
  })
}

function ContextMenuContent({
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  className,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  align?: FloatingAlign
  alignOffset?: number
  side?: FloatingSide
  sideOffset?: number
}) {
  const { open, setOpen, anchorRef, anchorVersion, triggerRef } = useContext(ContextMenuContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef,
    side,
    sideOffset,
    align,
    alignOffset,
    anchorKey: anchorVersion,
  })
  const { containerRef, onKeyDown: onRovingKeyDown } = useRovingFocus<HTMLDivElement>({
    orientation: "vertical",
    deps: [mounted],
  })

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, popupRef as React.RefObject<HTMLElement | null>],
  })

  useFocusOnOpen({ mounted, containerRef })

  if (!mounted) return null

  return createPortal(
    <div
      ref={popupRef as React.Ref<HTMLDivElement>}
      style={style}
      data-side={resolvedSide}
      className="isolate z-50 outline-none"
    >
      <div
        ref={mergeRefs(presenceRef as React.Ref<HTMLDivElement>, containerRef)}
        role="menu"
        data-slot="context-menu-content"
        data-side={resolvedSide}
        {...presenceAttrs}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          onRovingKeyDown(event)
        }}
        className={cn(
          "dark z-50 max-h-(--available-height) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function ContextMenuGroup({ ...props }: ComponentPropsWithoutRef<"div">) {
  return <div role="group" data-slot="context-menu-group" {...props} />
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ComponentPropsWithoutRef<"div"> & { inset?: boolean }) {
  return (
    <div
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "px-3 py-2.5 text-xs text-muted-foreground data-inset:pl-9.5",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  closeOnClick = true,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  disabled?: boolean
  closeOnClick?: boolean
}) {
  const { closeAll } = useContext(ContextMenuRootContext)
  return (
    <div
      role="menuitem"
      data-roving-item=""
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      data-disabled={disabled ? "true" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled && closeOnClick) closeAll()
      }}
      className={cn(
        "group/context-menu-item relative flex cursor-default items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSub({
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
  const [open, setOpenState] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)

  function setOpen(next: boolean, opts?: { focusTrigger?: boolean }) {
    setOpenState(next)
    if (!next && opts?.focusTrigger) triggerRef.current?.focus()
  }

  return (
    <ContextMenuContext.Provider
      value={{
        open,
        setOpen,
        anchorRef: triggerRef,
        anchorVersion: 0,
        setAnchor: () => {},
        triggerRef,
        contentRef,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  disabled,
  onClick,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & { inset?: boolean; disabled?: boolean }) {
  const { open, setOpen, anchorRef, contentRef } = useContext(ContextMenuContext)
  const { triggerHandlers } = useHoverIntent({
    contentRef,
    onOpen: () => !disabled && setOpen(true),
    onClose: () => setOpen(false),
  })

  return (
    <div
      ref={anchorRef as React.Ref<HTMLDivElement>}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      data-roving-item=""
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      data-open={open ? "" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) setOpen(!open)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || disabled) return
        if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          setOpen(true)
        }
      }}
      {...triggerHandlers}
      className={cn(
        "flex cursor-default items-center rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-9.5 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </div>
  )
}

function ContextMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  align?: FloatingAlign
  alignOffset?: number
  side?: FloatingSide
  sideOffset?: number
}) {
  const { open, setOpen, anchorRef, contentRef } = useContext(ContextMenuContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef,
    side,
    sideOffset,
    align,
    alignOffset,
  })
  const { containerRef, onKeyDown: onRovingKeyDown } = useRovingFocus<HTMLDivElement>({
    orientation: "vertical",
    deps: [mounted],
  })
  const { contentHandlers } = useHoverIntent({
    contentRef,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
  })

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    refs: [anchorRef as React.RefObject<HTMLElement | null>, popupRef as React.RefObject<HTMLElement | null>],
  })

  useFocusOnOpen({ mounted, containerRef })

  if (!mounted) return null

  return createPortal(
    <div
      ref={mergeRefs(popupRef as React.Ref<HTMLDivElement>, contentRef as React.Ref<HTMLDivElement>)}
      style={style}
      data-side={resolvedSide}
      className="isolate z-50 outline-none"
      {...contentHandlers}
    >
      <div
        ref={mergeRefs(presenceRef as React.Ref<HTMLDivElement>, containerRef)}
        role="menu"
        data-slot="context-menu-sub-content"
        data-side={resolvedSide}
        {...presenceAttrs}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "ArrowLeft") {
            event.preventDefault()
            setOpen(false, { focusTrigger: true })
            return
          }
          if (event.key === "Escape") {
            setOpen(false, { focusTrigger: true })
            return
          }
          onRovingKeyDown(event)
        }}
        className={cn(
          "dark shadow-lg animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  defaultChecked = false,
  onCheckedChange,
  inset,
  disabled,
  closeOnClick = false,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  inset?: boolean
  disabled?: boolean
  closeOnClick?: boolean
}) {
  const { closeAll } = useContext(ContextMenuRootContext)
  const [isChecked, setIsChecked] = useControllableState({
    prop: checked,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })

  return (
    <div
      role="menuitemcheckbox"
      aria-checked={isChecked}
      aria-disabled={disabled || undefined}
      data-roving-item=""
      data-slot="context-menu-checkbox-item"
      data-inset={inset}
      data-checked={isChecked ? "" : undefined}
      data-unchecked={!isChecked ? "" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || disabled) return
        setIsChecked(!isChecked)
        if (closeOnClick) closeAll()
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2">
        {isChecked && <CheckIcon />}
      </span>
      {children}
    </div>
  )
}

function ContextMenuRadioGroup({
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: ReactNode
}) {
  const [value, setValue] = useControllableState<string | undefined>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })
  return (
    <div role="group" data-slot="context-menu-radio-group">
      <ContextMenuRadioGroupContext.Provider value={{ value, setValue }}>
        {children}
      </ContextMenuRadioGroupContext.Provider>
    </div>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  value: itemValue,
  inset,
  disabled,
  closeOnClick = false,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  value: string
  inset?: boolean
  disabled?: boolean
  closeOnClick?: boolean
}) {
  const { closeAll } = useContext(ContextMenuRootContext)
  const radioGroup = useContext(ContextMenuRadioGroupContext)
  const checked = radioGroup?.value === itemValue

  return (
    <div
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      data-roving-item=""
      data-slot="context-menu-radio-item"
      data-inset={inset}
      data-checked={checked ? "" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || disabled) return
        radioGroup?.setValue(itemValue)
        if (closeOnClick) closeAll()
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2">
        {checked && <CheckIcon />}
      </span>
      {children}
    </div>
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      role="separator"
      data-slot="context-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}

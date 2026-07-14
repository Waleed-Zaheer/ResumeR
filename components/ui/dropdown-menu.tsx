"use client"

/**
 * DropdownMenu — a menu of actions/options that opens when its trigger is
 * clicked (or, inside a Menubar, on hover once a sibling menu is already
 * open). Supports nested submenus (open on hover with safe-polygon
 * tolerance, or ArrowRight/ArrowLeft), checkbox items, and radio items.
 * Arrow keys move real DOM focus between items; clicking any item (at any
 * nesting depth) closes the whole menu and returns focus to the trigger.
 *
 * Usage:
 *   <DropdownMenu>
 *     <DropdownMenuTrigger render={<Button variant="outline">Open</Button>} />
 *     <DropdownMenuContent>
 *       <DropdownMenuItem>Rename</DropdownMenuItem>
 *       <DropdownMenuSeparator />
 *       <DropdownMenuSub>
 *         <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
 *         <DropdownMenuSubContent>
 *           <DropdownMenuItem>Nested action</DropdownMenuItem>
 *         </DropdownMenuSubContent>
 *       </DropdownMenuSub>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts, merge-props.ts (the `render` prop, ref merging)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning)
 *   - src/lib/primitives/use-dismiss.ts (outside click / Escape to close)
 *   - src/lib/primitives/use-roving-focus.ts (arrow-key navigation between items)
 *   - src/lib/primitives/use-hover-intent.ts (submenu safe-polygon hover behavior)
 *   - src/lib/primitives/use-focus-on-open.ts (focuses the first item once the popup is actually visible)
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
  type FloatingSide,
} from "@/lib/primitives/use-floating-position"

/** Shared across the whole (possibly nested) menu tree: closing from any depth. */
const MenuRootContext = createContext<{
  closeAll: () => void
  rootTriggerRef: React.RefObject<HTMLElement | null>
}>({ closeAll: () => {}, rootTriggerRef: { current: null } })

/** Re-provided at every level (top menu and each submenu) for that level's own state. */
const MenuContext = createContext<{
  open: boolean
  setOpen: (open: boolean, opts?: { focusTrigger?: boolean }) => void
  triggerRef: React.RefObject<HTMLElement | null>
  /** The level's own popup element, shared so the trigger's hover-intent
   * triangle (computed in a sibling component) can read its bounding box. */
  contentRef: React.RefObject<HTMLElement | null>
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
  contentRef: { current: null },
})

/** Present only inside a Menubar - lets DropdownMenu/DropdownMenuTrigger self-coordinate. */
export const MenubarCoordinationContext = createContext<{
  openValue: string | null
  setOpenValue: (value: string | null) => void
  hasOpenMenu: boolean
} | null>(null)

const MenuRadioGroupContext = createContext<{
  value: string | undefined
  setValue: (value: string) => void
} | null>(null)

function DropdownMenu({
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
  const menubar = useContext(MenubarCoordinationContext)
  const isInMenubar = menubar !== null
  const menuId = useId()

  const [standaloneOpen, setStandaloneOpen] = useControllableState({
    prop: isInMenubar ? undefined : openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  const open = isInMenubar ? menubar!.openValue === menuId : standaloneOpen
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)

  function setOpen(next: boolean, opts?: { focusTrigger?: boolean }) {
    if (isInMenubar) {
      menubar!.setOpenValue(next ? menuId : null)
      onOpenChange?.(next)
    } else {
      setStandaloneOpen(next)
    }
    if (!next && opts?.focusTrigger) triggerRef.current?.focus()
  }

  return (
    <MenuRootContext.Provider value={{ closeAll: () => setOpen(false, { focusTrigger: true }), rootTriggerRef: triggerRef }}>
      <MenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
        {children}
      </MenuContext.Provider>
    </MenuRootContext.Provider>
  )
}

function DropdownMenuPortal({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function DropdownMenuTrigger({
  render,
  disabled,
  onClick,
  onMouseEnter,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { open, setOpen, triggerRef } = useContext(MenuContext)
  const menubar = useContext(MenubarCoordinationContext)
  const canHoverOpen = menubar !== null && menubar.hasOpenMenu

  return useRender({
    render,
    ref: triggerRef,
    defaultTagName: "button",
    props: {
      type: render ? undefined : "button",
      disabled,
      "data-slot": "dropdown-menu-trigger",
      "data-popup-open": open ? "" : undefined,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented && !disabled) setOpen(!open)
      },
      onMouseEnter: (event: React.MouseEvent) => {
        onMouseEnter?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented && canHoverOpen && !disabled && !open) setOpen(true)
      },
      ...props,
    },
  })
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  align?: FloatingAlign
  alignOffset?: number
  side?: FloatingSide
  sideOffset?: number
}) {
  const { open, setOpen, triggerRef } = useContext(MenuContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef: triggerRef,
    side,
    sideOffset,
    align,
    alignOffset,
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
        data-slot="dropdown-menu-content"
        data-side={resolvedSide}
        {...presenceAttrs}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "Escape") {
            setOpen(false, { focusTrigger: true })
            return
          }
          onRovingKeyDown(event)
        }}
        className={cn(
          "dark z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function DropdownMenuGroup({ ...props }: ComponentPropsWithoutRef<"div">) {
  return <div role="group" data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentPropsWithoutRef<"div"> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-3 py-2.5 text-xs text-muted-foreground data-inset:pl-9.5",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  closeOnClick = true,
  onClick,
  render,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  disabled?: boolean
  closeOnClick?: boolean
  render?: ReactElement<Record<string, unknown>>
}) {
  const { closeAll } = useContext(MenuRootContext)
  return useRender({
    render,
    defaultTagName: "div",
    props: {
      role: "menuitem",
      "data-roving-item": "",
      "data-slot": "dropdown-menu-item",
      "data-inset": inset,
      "data-variant": variant,
      "data-disabled": disabled ? "true" : undefined,
      "aria-disabled": disabled || undefined,
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLDivElement>)
        if (!event.defaultPrevented && !disabled && closeOnClick) closeAll()
      },
      className: cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        className
      ),
      ...props,
    },
  })
}

function DropdownMenuSub({
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
    <MenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      {children}
    </MenuContext.Provider>
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  disabled,
  onClick,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & { inset?: boolean; disabled?: boolean }) {
  const { open, setOpen, triggerRef, contentRef } = useContext(MenuContext)
  const { triggerHandlers } = useHoverIntent({
    contentRef,
    onOpen: () => !disabled && setOpen(true),
    onClose: () => setOpen(false),
  })

  return (
    <div
      ref={triggerRef as React.Ref<HTMLDivElement>}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      data-roving-item=""
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      data-popup-open={open ? "" : undefined}
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
        "flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
      // Stash the content ref on a data-* isn't valid React - see contentRefRegistry workaround below.
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </div>
  )
}

function DropdownMenuSubContent({
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
  const { open, setOpen, triggerRef, contentRef } = useContext(MenuContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef: triggerRef,
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
    refs: [triggerRef, popupRef as React.RefObject<HTMLElement | null>],
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
        data-slot="dropdown-menu-sub-content"
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
          "dark w-auto min-w-36 rounded-3xl p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function DropdownMenuCheckboxItem({
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
  const { closeAll } = useContext(MenuRootContext)
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
      data-slot="dropdown-menu-checkbox-item"
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
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        {isChecked && <CheckIcon />}
      </span>
      {children}
    </div>
  )
}

function DropdownMenuRadioGroup({
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
    <div role="group" data-slot="dropdown-menu-radio-group">
      <MenuRadioGroupContext.Provider value={{ value, setValue }}>
        {children}
      </MenuRadioGroupContext.Provider>
    </div>
  )
}

function DropdownMenuRadioItem({
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
  const { closeAll } = useContext(MenuRootContext)
  const radioGroup = useContext(MenuRadioGroupContext)
  const checked = radioGroup?.value === itemValue

  return (
    <div
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      data-roving-item=""
      data-slot="dropdown-menu-radio-item"
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
        "relative flex cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        {checked && <CheckIcon />}
      </span>
      {children}
    </div>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}

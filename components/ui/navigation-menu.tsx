"use client"

/**
 * NavigationMenu — a horizontal row of links and dropdown-triggering
 * items for primary site navigation. Hovering (or clicking) a trigger
 * opens its dropdown; hovering a sibling trigger switches to that one
 * without needing another click; the whole menu closes when the mouse
 * leaves it.
 *
 * Simplification vs. the original: each trigger's dropdown positions
 * itself independently (like a small Popover) rather than sharing one
 * viewport panel that morphs its width/height between items — the
 * functional behavior (hover/click/switch/close) is the same, but the
 * between-item transition isn't the same smooth width/height morph.
 *
 * Usage:
 *   <NavigationMenu>
 *     <NavigationMenuList>
 *       <NavigationMenuItem>
 *         <NavigationMenuTrigger>Products</NavigationMenuTrigger>
 *         <NavigationMenuContent>...</NavigationMenuContent>
 *       </NavigationMenuItem>
 *     </NavigationMenuList>
 *   </NavigationMenu>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning)
 */
import {
  createContext,
  useContext,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { cva } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { usePresence } from "@/lib/primitives/use-presence"
import { useFloatingPosition, type FloatingAlign } from "@/lib/primitives/use-floating-position"

const NavigationMenuContext = createContext<{
  value: string | null
  setValue: (value: string | null) => void
  align: FloatingAlign
}>({ value: null, setValue: () => {}, align: "start" })

const NavigationMenuItemContext = createContext<{
  itemValue: string
  triggerRef: React.RefObject<HTMLElement | null>
} | null>(null)

function NavigationMenu({
  align = "start",
  className,
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  align?: FloatingAlign
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useControllableState<string | null>({
    prop: valueProp,
    defaultProp: defaultValue ?? null,
    onChange: (next) => {
      if (next !== null) onValueChange?.(next)
    },
  })

  return (
    <NavigationMenuContext.Provider value={{ value, setValue, align }}>
      <div
        data-slot="navigation-menu"
        onMouseLeave={() => setValue(null)}
        className={cn(
          "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </NavigationMenuContext.Provider>
  )
}

function NavigationMenuList({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-0",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  const itemValue = useId()
  const triggerRef = useRef<HTMLElement | null>(null)

  return (
    <NavigationMenuItemContext.Provider value={{ itemValue, triggerRef }}>
      <li data-slot="navigation-menu-item" className={cn("relative", className)} {...props}>
        {children}
      </li>
    </NavigationMenuItemContext.Provider>
  )
}

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center rounded-3xl px-4.5 py-2.5 text-sm font-medium transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted data-open:bg-muted/50 data-open:hover:bg-muted data-open:focus:bg-muted"
)

function NavigationMenuTrigger({
  className,
  children,
  onClick,
  onMouseEnter,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { value, setValue } = useContext(NavigationMenuContext)
  const item = useContext(NavigationMenuItemContext)
  if (!item) throw new Error("NavigationMenuTrigger must be used within a NavigationMenuItem")
  const open = value === item.itemValue

  return (
    <button
      ref={item.triggerRef as React.Ref<HTMLButtonElement>}
      type="button"
      data-slot="navigation-menu-trigger"
      data-open={open ? "" : undefined}
      data-popup-open={open ? "" : undefined}
      aria-expanded={open}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        setValue(item.itemValue)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setValue(open ? null : item.itemValue)
      }}
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-px ml-1 size-3 transition duration-300 group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180"
        aria-hidden="true"
      />
    </button>
  )
}

function NavigationMenuContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { value, align } = useContext(NavigationMenuContext)
  const item = useContext(NavigationMenuItemContext)
  if (!item) throw new Error("NavigationMenuContent must be used within a NavigationMenuItem")
  const open = value === item.itemValue

  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style } = useFloatingPosition({
    open: mounted,
    anchorRef: item.triggerRef,
    side: "bottom",
    sideOffset: 8,
    align,
  })

  if (!mounted) return null

  return createPortal(
    <div
      ref={popupRef as React.Ref<HTMLDivElement>}
      style={style}
      className="isolate z-50"
    >
      <div
        ref={presenceRef as React.Ref<HTMLDivElement>}
        data-slot="navigation-menu-content"
        {...presenceAttrs}
        className={cn(
          "w-auto rounded-3xl bg-popover p-2.5 pr-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5 transition-[opacity,transform] duration-300 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:ring-foreground/10 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function NavigationMenuLink({ className, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      data-slot="navigation-menu-link"
      className={cn(
        "flex items-center gap-1.5 rounded-3xl p-3 text-sm transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-1 in-data-[slot=navigation-menu-content]:rounded-2xl data-[active=true]:bg-muted/50 data-[active=true]:hover:bg-muted data-[active=true]:focus:bg-muted [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </div>
  )
}

function NavigationMenuPositioner({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children?: ReactNode }) {
  return (
    <div data-slot="navigation-menu-positioner" className={cn("isolate z-50", className)} {...props}>
      {children}
    </div>
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
}

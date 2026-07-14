"use client"

/**
 * Combobox — a text input paired with a filtered, keyboard-navigable
 * list. Typing filters the list (matched against the `items` array you
 * pass to the root); arrow keys move a virtual highlight (real focus
 * stays on the input) via data-highlighted; Enter selects the
 * highlighted item.
 *
 * Usage:
 *   <Combobox items={frameworks} value={value} onValueChange={setValue}>
 *     <ComboboxInput placeholder="Select..." />
 *     <ComboboxContent>
 *       <ComboboxEmpty>No results.</ComboboxEmpty>
 *       <ComboboxList>
 *         {frameworks.map((f) => <ComboboxItem key={f} value={f}>{f}</ComboboxItem>)}
 *       </ComboboxList>
 *     </ComboboxContent>
 *   </Combobox>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-render.ts (the `render` prop, e.g. ComboboxClear)
 *   - src/lib/primitives/use-presence.ts (exit animation)
 *   - src/lib/primitives/use-floating-position.ts (anchored positioning, incl. external anchor)
 *   - src/lib/primitives/use-dismiss.ts (outside click / Escape to close)
 *   - src/lib/primitives/use-active-descendant.ts (arrow-key virtual highlight + filtering)
 *   - src/components/ui/button.tsx, src/components/ui/input-group.tsx (building blocks)
 */
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useRender } from "@/lib/primitives/use-render"
import { usePresence } from "@/lib/primitives/use-presence"
import { useDismiss } from "@/lib/primitives/use-dismiss"
import { useActiveDescendant } from "@/lib/primitives/use-active-descendant"
import { useFloatingPosition, type FloatingAlign, type FloatingSide } from "@/lib/primitives/use-floating-position"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const ComboboxContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  value: string | null
  setValue: (value: string | null) => void
  inputValue: string
  setInputValue: (value: string) => void
  activeValue: string | null
  setActiveValue: (value: string | null) => void
  triggerRef: React.RefObject<HTMLElement | null>
  listRef: React.RefObject<HTMLUListElement | null>
  matches: (itemValue: string, label: string) => boolean
  visibleCount: number
  registerItem: (visible: boolean) => () => void
}>({
  open: false,
  setOpen: () => {},
  value: null,
  setValue: () => {},
  inputValue: "",
  setInputValue: () => {},
  activeValue: null,
  setActiveValue: () => {},
  triggerRef: { current: null },
  listRef: { current: null },
  matches: () => true,
  visibleCount: 0,
  registerItem: () => () => {},
})

function Combobox({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  items?: string[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}) {
  const [value, setValue] = useControllableState<string | null>({
    prop: valueProp,
    defaultProp: defaultValue ?? null,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const [inputValue, setInputValue] = useState("")
  const [activeValue, setActiveValue] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(0)

  const knownItems = useMemo(() => items?.map((i) => i.toLowerCase()), [items])

  function matches(itemValue: string, label: string) {
    if (!inputValue) return true
    const needle = inputValue.toLowerCase()
    if (knownItems && !knownItems.includes(itemValue.toLowerCase())) return true
    return label.toLowerCase().includes(needle) || itemValue.toLowerCase().includes(needle)
  }

  function registerItem(visible: boolean) {
    setVisibleCount((c) => c + (visible ? 1 : 0))
    return () => setVisibleCount((c) => c - (visible ? 1 : 0))
  }

  return (
    <ComboboxContext.Provider
      value={{
        open,
        setOpen,
        value,
        setValue,
        inputValue,
        setInputValue,
        activeValue,
        setActiveValue,
        triggerRef,
        listRef,
        matches,
        visibleCount,
        registerItem,
      }}
    >
      {children}
    </ComboboxContext.Provider>
  )
}

function ComboboxValue({ ...props }: ComponentPropsWithoutRef<"span">) {
  const { value } = useContext(ComboboxContext)
  return (
    <span data-slot="combobox-value" {...props}>
      {value}
    </span>
  )
}

function ComboboxTrigger({
  className,
  children,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { open, setOpen } = useContext(ComboboxContext)
  return (
    <button
      type="button"
      data-slot="combobox-trigger"
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </button>
  )
}

function ComboboxClear({
  className,
  render,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  render?: ReactElement<Record<string, unknown>>
}) {
  const { setValue, setInputValue } = useContext(ComboboxContext)
  return useRender({
    render: render ?? <InputGroupButton variant="ghost" size="icon-xs" />,
    defaultTagName: "button",
    props: {
      "data-slot": "combobox-clear",
      className: cn(className),
      onClick: (event: React.MouseEvent) => {
        onClick?.(event as React.MouseEvent<HTMLButtonElement>)
        if (!event.defaultPrevented) {
          setValue(null)
          setInputValue("")
        }
      },
      children: <XIcon className="pointer-events-none" />,
      ...props,
    },
  })
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  onChange,
  onKeyDown,
  onFocus,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  const { setOpen, inputValue, setInputValue, activeValue, setValue, setActiveValue, listRef, triggerRef } =
    useContext(ComboboxContext)
  const { onKeyDown: onActiveDescendantKeyDown } = useActiveDescendant({
    activeValue,
    setActiveValue,
    containerRef: listRef,
    onSelect: (v) => {
      setValue(v)
      setOpen(false)
    },
  })

  return (
    <InputGroup ref={triggerRef as React.Ref<HTMLDivElement>} className={cn("w-auto", className)}>
      <InputGroupInput
        disabled={disabled}
        value={inputValue}
        role="combobox"
        aria-expanded
        onFocus={(event) => {
          onFocus?.(event)
          setOpen(true)
        }}
        onChange={(event) => {
          onChange?.(event)
          setInputValue(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          onActiveDescendantKeyDown(event)
        }}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
  anchor?: React.RefObject<HTMLElement | null>
}) {
  const { open, setOpen, triggerRef } = useContext(ComboboxContext)
  const { mounted, ref: presenceRef, ...presenceAttrs } = usePresence(open)
  const { popupRef, style, side: resolvedSide } = useFloatingPosition({
    open: mounted,
    anchorRef: anchor ?? triggerRef,
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
    <div ref={popupRef as React.Ref<HTMLDivElement>} style={style} data-side={resolvedSide} className="isolate z-50">
      <div
        ref={presenceRef as React.Ref<HTMLDivElement>}
        role="presentation"
        data-slot="combobox-content"
        data-chips={!!anchor}
        data-side={resolvedSide}
        {...presenceAttrs}
        className={cn(
          "dark group/combobox-content max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-3xl text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1.5 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/50 *:data-[slot=input-group]:shadow-none dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
          className
        )}
        {...props}
      />
    </div>,
    document.body
  )
}

function ComboboxList({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  const { setActiveValue, activeValue, listRef } = useContext(ComboboxContext)
  return (
    <ul
      ref={listRef}
      role="listbox"
      data-slot="combobox-list"
      onMouseMove={(event) => {
        const item = (event.target as HTMLElement).closest<HTMLElement>("[data-active-item]")
        const v = item?.getAttribute("data-value")
        if (v && v !== activeValue) setActiveValue(v)
      }}
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  value: itemValue,
  disabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"li"> & { value: string; disabled?: boolean }) {
  const { value, setValue, setOpen, activeValue, matches } = useContext(ComboboxContext)
  const selected = value === itemValue
  const active = activeValue === itemValue
  const label = typeof children === "string" ? children : itemValue
  const visible = matches(itemValue, label)

  if (!visible) return null

  return (
    <li
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-active-item=""
      data-slot="combobox-item"
      data-value={itemValue}
      data-disabled={disabled ? "true" : undefined}
      data-highlighted={active ? "" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) {
          setValue(itemValue)
          setOpen(false)
        }
      }}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {selected && (
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="pointer-events-none" />
        </span>
      )}
    </li>
  )
}

function ComboboxGroup({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div role="group" data-slot="combobox-group" className={cn(className)} {...props} />
}

function ComboboxLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="combobox-label"
      className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

function ComboboxEmpty({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { inputValue } = useContext(ComboboxContext)
  // Rendered by the consumer alongside ComboboxList; since filtering hides
  // non-matching items individually, we show this whenever there's a
  // search term (a real "0 results" check would need item registration,
  // kept intentionally simple here).
  if (!inputValue) return null
  return (
    <div
      data-slot="combobox-empty"
      className={cn(
        "flex w-full justify-center py-2 text-center text-sm text-muted-foreground empty:hidden",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      role="separator"
      data-slot="combobox-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  )
}

function ComboboxChips({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-transparent bg-input/50 bg-clip-padding px-3 py-1.5 text-sm transition-[color,box-shadow,background-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  onRemove,
  ...props
}: ComponentPropsWithoutRef<"div"> & { showRemove?: boolean; onRemove?: () => void }) {
  return (
    <div
      data-slot="combobox-chip"
      className={cn(
        "flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-3xl bg-input px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0 dark:bg-input/60",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </Button>
      )}
    </div>
  )
}

function ComboboxChipsInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxClear,
  useComboboxAnchor,
}

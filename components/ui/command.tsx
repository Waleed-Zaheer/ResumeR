"use client"

/**
 * Command — a searchable, keyboard-navigable command list (the "⌘K
 * palette" pattern): type to fuzzy-filter and reorder items by
 * relevance, arrow keys move a virtual "active" selection (real focus
 * stays on the input the whole time - see use-active-descendant.ts),
 * Enter runs the active item's onSelect.
 *
 * Usage:
 *   <Command>
 *     <CommandInput placeholder="Type a command..." />
 *     <CommandList>
 *       <CommandEmpty>No results found.</CommandEmpty>
 *       <CommandGroup heading="Suggestions">
 *         <CommandItem onSelect={() => ...}>Calendar</CommandItem>
 *       </CommandGroup>
 *     </CommandList>
 *   </Command>
 *
 *   // Elevated in a dialog (this project's own ⌘K search uses this):
 *   <CommandDialog open={open} onOpenChange={setOpen}>...</CommandDialog>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-active-descendant.ts (arrow-key navigation, virtual "active" selection)
 *   - src/components/ui/dialog.tsx (CommandDialog)
 *   - src/components/ui/input-group.tsx (CommandInput's wrapper)
 */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { useActiveDescendant } from "@/lib/primitives/use-active-descendant"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

type CommandFilter = (value: string, search: string, keywords?: string[]) => number

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(" ")
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children)
  return ""
}

const WORD_BOUNDARY = /[\s\-_/]/

/** Subsequence fuzzy match: every search character must appear, in order,
 * somewhere in the text. Scores reward matches at word boundaries, runs
 * of consecutive characters, and a shorter overall match span - so
 * "cmd" ranks "Command Menu" above "documented". */
function fuzzyScore(text: string, search: string, keywords?: string[]): number {
  const query = search.trim().toLowerCase()
  if (!query) return 1
  const haystack = (keywords && keywords.length > 0 ? `${text} ${keywords.join(" ")}` : text).toLowerCase()

  const exactIndex = haystack.indexOf(query)
  if (exactIndex !== -1) {
    const atBoundary = exactIndex === 0 || WORD_BOUNDARY.test(haystack[exactIndex - 1])
    return (atBoundary ? 1 : 0.85) - exactIndex * 0.0005
  }

  let hi = 0
  let qi = 0
  let consecutive = 0
  let score = 0
  let firstMatch = -1
  while (hi < haystack.length && qi < query.length) {
    if (haystack[hi] === query[qi]) {
      if (firstMatch === -1) firstMatch = hi
      const atBoundary = hi === 0 || WORD_BOUNDARY.test(haystack[hi - 1])
      consecutive += 1
      score += (atBoundary ? 0.8 : 0.4) + Math.min(consecutive, 5) * 0.05
      qi += 1
    } else {
      consecutive = 0
    }
    hi += 1
  }
  if (qi < query.length) return 0

  const span = hi - firstMatch
  return Math.max(0.01, score / query.length / (1 + span * 0.03))
}

const defaultFilter: CommandFilter = fuzzyScore

type CommandItemElementProps = {
  value?: string
  keywords?: string[]
  forceMount?: boolean
  children?: ReactNode
}

function itemValueOf(props: CommandItemElementProps): string {
  return (props.value ?? extractText(props.children)).trim().toLowerCase()
}

function itemVisible(props: CommandItemElementProps, context: CommandContextValue): boolean {
  if (props.forceMount || !context.shouldFilter) return true
  return context.filter(itemValueOf(props), context.search, props.keywords) > 0
}

/** Walk children (including into CommandGroups) collecting every visible
 * CommandItem's value, in filtered+sorted order - used for the empty
 * state and for auto-correcting the active selection. */
function collectVisibleValues(children: ReactNode, context: CommandContextValue): string[] {
  const scored: { value: string; score: number }[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as CommandItemElementProps
    if (child.type === CommandItem) {
      if (!itemVisible(props, context)) return
      scored.push({ value: itemValueOf(props), score: props.forceMount ? 1 : context.filter(itemValueOf(props), context.search, props.keywords) })
    } else if (child.type === CommandGroup) {
      collectVisibleValues((props as { children?: ReactNode }).children, context).forEach((value, i) =>
        scored.push({ value, score: -i })
      )
    }
  })
  return scored.sort((a, b) => b.score - a.score).map((s) => s.value)
}

type CommandContextValue = {
  search: string
  setSearch: (search: string) => void
  filter: CommandFilter
  shouldFilter: boolean
  activeValue: string
  setActiveValue: (value: string) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  loop: boolean
  registerSelectHandler: (value: string, handler: (() => void) | undefined) => void
}

const CommandContext = createContext<CommandContextValue | null>(null)

function useCommandContext() {
  const context = useContext(CommandContext)
  if (!context) throw new Error("Command parts must be used within a Command.")
  return context
}

function Command({
  className,
  label,
  shouldFilter = true,
  filter = defaultFilter,
  defaultValue,
  value: valueProp,
  onValueChange,
  loop = false,
  children,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  label?: string
  shouldFilter?: boolean
  filter?: CommandFilter
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  loop?: boolean
}) {
  const [search, setSearch] = useState("")
  const [activeValue, setActiveValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? "",
    onChange: onValueChange,
  })
  const selectHandlersRef = useRef(new Map<string, () => void>())

  function registerSelectHandler(value: string, handler: (() => void) | undefined) {
    if (handler) selectHandlersRef.current.set(value, handler)
    else selectHandlersRef.current.delete(value)
  }

  const { containerRef, onKeyDown: onActiveDescendantKeyDown } = useActiveDescendant<HTMLDivElement>({
    activeValue,
    setActiveValue: (value) => setActiveValue(value ?? ""),
    onSelect: (value) => selectHandlersRef.current.get(value)?.(),
    loop,
  })

  const context = useMemo<CommandContextValue>(
    () => ({
      search,
      setSearch,
      filter,
      shouldFilter,
      activeValue,
      setActiveValue,
      containerRef,
      loop,
      registerSelectHandler,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, filter, shouldFilter, activeValue, setActiveValue, containerRef, loop]
  )

  return (
    <CommandContext.Provider value={context}>
      <div
        ref={containerRef}
        data-slot="command"
        role="application"
        aria-label={label ?? "Command Menu"}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          onActiveDescendantKeyDown(event)
        }}
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-4xl bg-popover p-1 text-popover-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-4xl! p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-none border-none bg-transparent">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  value: valueProp,
  onValueChange,
  onChange,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "value"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  const { search, setSearch } = useCommandContext()
  const initializedRef = useRef(false)
  if (!initializedRef.current && valueProp !== undefined) {
    initializedRef.current = true
    if (valueProp !== search) setSearch(valueProp)
  }

  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-9 bg-input/50">
        <input
          data-slot="command-input"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          value={search}
          onChange={(event) => {
            onChange?.(event)
            if (event.defaultPrevented) return
            const next = event.target.value
            setSearch(next)
            onValueChange?.(next)
          }}
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  const context = useCommandContext()
  // Tracks the previous search value (not "is this the first effect run")
  // so StrictMode's setup->cleanup->setup double-invoke on mount can't
  // trick this into treating the second setup as a real search change.
  const prevSearchRef = useRef<string | null>(null)

  const visibleValues = useMemo(
    () => collectVisibleValues(children, context),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, context.search, context.shouldFilter, context.filter]
  )

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== null && prevSearchRef.current !== context.search
    prevSearchRef.current = context.search
    if (!searchChanged) return
    if (visibleValues.length > 0 && !visibleValues.includes(context.activeValue)) {
      context.setActiveValue(visibleValues[0])
    }
    // Only re-evaluate when the search text changes - not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.search])

  return (
    <CommandVisibilityContext.Provider value={visibleValues.length === 0}>
      <div
        data-slot="command-list"
        role="listbox"
        aria-label="Suggestions"
        className={cn(
          "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandVisibilityContext.Provider>
  )
}

const CommandVisibilityContext = createContext(false)

function CommandEmpty({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const isEmpty = useContext(CommandVisibilityContext)
  if (!isEmpty) return null
  return (
    <div
      data-slot="command-empty"
      role="presentation"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  heading,
  value: _value,
  forceMount = false,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  heading?: ReactNode
  value?: string
  forceMount?: boolean
}) {
  const context = useCommandContext()
  const headingId = useId()

  const sortedItems = useMemo(() => {
    const scored: { element: ReactElement; score: number; index: number }[] = []
    let index = 0
    Children.forEach(children, (child) => {
      if (!isValidElement(child) || child.type !== CommandItem) return
      const itemProps = child.props as CommandItemElementProps
      if (!itemVisible(itemProps, context)) return
      const score = itemProps.forceMount ? 1 : context.filter(itemValueOf(itemProps), context.search, itemProps.keywords)
      scored.push({ element: child, score, index: index++ })
    })
    scored.sort((a, b) => b.score - a.score || a.index - b.index)
    return scored.map((s) => s.element)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, context.search, context.shouldFilter, context.filter])

  const visible = forceMount || sortedItems.length > 0

  return (
    <div
      data-slot="command-group"
      hidden={!visible}
      role="presentation"
      className={cn(
        "overflow-hidden p-1.5 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {heading != null && (
        <div {...{ "cmdk-group-heading": "" }} id={headingId} aria-hidden="true">
          {heading}
        </div>
      )}
      <div role="group" aria-labelledby={heading != null ? headingId : undefined}>
        {sortedItems}
      </div>
    </div>
  )
}

function CommandSeparator({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { search } = useCommandContext()
  if (search.trim().length > 0) return null
  return (
    <div
      data-slot="command-separator"
      role="separator"
      className={cn("my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  value: _value,
  keywords: _keywords,
  onSelect,
  disabled = false,
  forceMount: _forceMount,
  onClick,
  onPointerMove,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  value?: string
  keywords?: string[]
  onSelect?: (value: string) => void
  disabled?: boolean
  forceMount?: boolean
}) {
  const context = useCommandContext()
  const value = itemValueOf({ value: _value, children })
  const isSelected = value !== "" && context.activeValue === value

  useEffect(() => {
    context.registerSelectHandler(value, disabled ? undefined : () => onSelect?.(value))
    return () => context.registerSelectHandler(value, undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onSelect, disabled])

  return (
    <div
      data-slot="command-item"
      data-active-item=""
      data-value={value}
      data-disabled={disabled ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
      aria-disabled={disabled || undefined}
      aria-selected={isSelected}
      role="option"
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (!disabled && !event.defaultPrevented) context.setActiveValue(value)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (!disabled && !event.defaultPrevented) onSelect?.(value)
      }}
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium outline-hidden select-none in-data-[slot=dialog-content]:rounded-3xl data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </div>
  )
}

function CommandShortcut({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

"use client"

/**
 * Resizable — a flexbox-based panel group with draggable dividers (no
 * `react-resizable-panels` dependency). Panels size themselves via CSS
 * `flex-grow`, driven by a percentage "layout" the group computes and
 * shares through context; dragging (or arrow-key-focusing) a
 * `ResizableHandle` adjusts the flex-grow of the two panels immediately
 * on either side of it.
 *
 * Feature scope: `defaultSize`/`minSize`/`maxSize`/`collapsedSize` are
 * always treated as plain percentages (0-100) of the group's size -
 * the real library's px/em/rem/vh/vw units and its "bare number means
 * pixels, then re-normalized to percent" pixel pipeline are not
 * implemented, since this is simpler/more predictable and produces an
 * identical result for every demo in this project (which only ever
 * uses equal-percentage defaults). Dragging/keyboard-resizing only
 * ever affects the two panels immediately adjacent to a handle - the
 * real library's cascade (pushing a resize through additional panels
 * once a neighbor hits its min/max) is not implemented, since no demo
 * here has more than two panels to exercise it. `collapsible`/
 * `collapsedSize` and Enter-to-collapse are implemented but
 * unverified (no demo uses them). Persisted layouts (`defaultLayout`,
 * `useDefaultLayout`), the imperative `groupRef`/`panelRef` APIs, and
 * `groupResizeBehavior="preserve-pixel-size"` are not implemented.
 *
 * Usage:
 *   <ResizablePanelGroup orientation="horizontal">
 *     <ResizablePanel defaultSize={50}>Left</ResizablePanel>
 *     <ResizableHandle withHandle />
 *     <ResizablePanel defaultSize={50}>Right</ResizablePanel>
 *   </ResizablePanelGroup>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

const KEYBOARD_STEP = 5
const DEFAULT_MIN_SIZE = 0
const DEFAULT_MAX_SIZE = 100
const DEFAULT_COLLAPSED_SIZE = 0

type PanelConfig = {
  id: string
  defaultSize?: number
  minSize: number
  maxSize: number
  collapsible?: boolean
  collapsedSize: number
}

type LayoutChangedMeta = { isUserInteraction: boolean }

type GroupContextValue = {
  orientation: "horizontal" | "vertical"
  layout: Record<string, number>
  groupDisabled?: boolean
  groupElRef: React.RefObject<HTMLDivElement | null>
  resizePair: (
    separatorIndex: number,
    deltaPercent: number,
    isUserInteraction: boolean,
    baseline?: { prevSize: number; nextSize: number }
  ) => void
  resetPair: (separatorIndex: number) => void
  toggleCollapse: (separatorIndex: number) => void
  getPairConfig: (separatorIndex: number) => { prev: PanelConfig; next: PanelConfig } | null
}

const ResizableGroupContext = createContext<GroupContextValue | null>(null)

function useResizableGroup() {
  const context = useContext(ResizableGroupContext)
  if (!context) {
    throw new Error("Resizable components must be used within a <ResizablePanelGroup />")
  }
  return context
}

function parseSize(value: number | string | undefined, fallback: number) {
  if (value === undefined) return fallback
  if (typeof value === "number") return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function computeInitialLayout(configs: PanelConfig[]) {
  const explicit = configs.filter((c) => c.defaultSize !== undefined)
  const implicit = configs.filter((c) => c.defaultSize === undefined)
  const explicitSum = explicit.reduce((sum, c) => sum + (c.defaultSize ?? 0), 0)
  const remaining = Math.max(0, 100 - explicitSum)
  const perImplicit = implicit.length > 0 ? remaining / implicit.length : 0

  const layout: Record<string, number> = {}
  for (const c of configs) {
    layout[c.id] = c.defaultSize !== undefined ? c.defaultSize : perImplicit
  }

  const total = Object.values(layout).reduce((a, b) => a + b, 0)
  if (total > 0 && Math.abs(total - 100) > 0.01) {
    const scale = 100 / total
    for (const id in layout) layout[id] *= scale
  }
  for (const c of configs) {
    layout[c.id] = Math.min(c.maxSize, Math.max(c.minSize, layout[c.id] ?? 0))
  }
  return layout
}

/** Applies `delta` to `prevSize` (and the inverse to `nextSize`), clamping
 * both to their own [minSize, maxSize] while keeping their sum constant -
 * shared by drag, keyboard, reset, and collapse so they can't drift out of
 * sync with each other. */
function clampPairDelta(
  prevSize: number,
  nextSize: number,
  prev: PanelConfig,
  next: PanelConfig,
  delta: number
) {
  let newPrev = prevSize + delta
  let newNext = nextSize - delta
  if (newPrev < prev.minSize) { newNext += newPrev - prev.minSize; newPrev = prev.minSize }
  if (newPrev > prev.maxSize) { newNext += newPrev - prev.maxSize; newPrev = prev.maxSize }
  if (newNext < next.minSize) { newPrev += newNext - next.minSize; newNext = next.minSize }
  if (newNext > next.maxSize) { newPrev += newNext - next.maxSize; newNext = next.maxSize }
  newPrev = Math.min(prev.maxSize, Math.max(prev.minSize, newPrev))
  newNext = Math.min(next.maxSize, Math.max(next.minSize, newNext))
  return [newPrev, newNext] as const
}

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

type ResizablePanelGroupProps = Omit<ComponentProps<"div">, "onResize"> & {
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  onLayoutChange?: (layout: Record<string, number>) => void
  onLayoutChanged?: (layout: Record<string, number>, meta: LayoutChangedMeta) => void
}

function scanChildren(children: ReactNode) {
  const configs: PanelConfig[] = []
  let panelIndex = 0
  let separatorIndex = 0

  const processed = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    if (child.type === ResizablePanel) {
      const props = child.props as ResizablePanelProps
      const id = props.id !== undefined ? String(props.id) : `panel-${panelIndex}`
      const collapsedSize = parseSize(props.collapsedSize, DEFAULT_COLLAPSED_SIZE)
      configs.push({
        id,
        defaultSize: props.defaultSize !== undefined ? parseSize(props.defaultSize, 0) : undefined,
        minSize: parseSize(props.minSize, DEFAULT_MIN_SIZE),
        maxSize: parseSize(props.maxSize, DEFAULT_MAX_SIZE),
        collapsible: props.collapsible,
        collapsedSize,
      })
      panelIndex += 1
      return cloneElement(child, { key: child.key ?? id, resolvedId: id } as Partial<ResizablePanelProps>)
    }

    if (child.type === ResizableHandle) {
      const index = separatorIndex
      separatorIndex += 1
      return cloneElement(child, { key: child.key ?? `separator-${index}`, separatorIndex: index } as Partial<ResizableHandleProps>)
    }

    return child
  })

  return { configs, processed }
}

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  disabled,
  onLayoutChange,
  onLayoutChanged,
  style,
  children,
  ...props
}: ResizablePanelGroupProps) {
  const groupElRef = useRef<HTMLDivElement | null>(null)
  const { configs, processed } = useMemo(() => scanChildren(children), [children])
  const configsRef = useRef(configs)
  configsRef.current = configs

  const [layout, setLayout] = useState<Record<string, number>>(() => computeInitialLayout(configs))
  const expandedSizeRef = useRef<Record<string, number>>({})

  useEffect(() => {
    setLayout((prev) => {
      const ids = configs.map((c) => c.id)
      const unchanged = ids.length === Object.keys(prev).length && ids.every((id) => id in prev)
      return unchanged ? prev : computeInitialLayout(configs)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.map((c) => c.id).join(",")])

  function getPairConfig(separatorIndex: number) {
    const prev = configsRef.current[separatorIndex]
    const next = configsRef.current[separatorIndex + 1]
    if (!prev || !next) return null
    return { prev, next }
  }

  function commitLayout(nextLayout: Record<string, number>, isUserInteraction: boolean) {
    onLayoutChange?.(nextLayout)
    onLayoutChanged?.(nextLayout, { isUserInteraction })
    return nextLayout
  }

  /** `baseline`, when given, is used instead of the layout state at update
   * time - drag passes the sizes captured at pointer-down so every
   * pointermove computes an absolute delta from a fixed origin instead of
   * compounding onto whatever the previous move already committed. */
  function resizePair(
    separatorIndex: number,
    deltaPercent: number,
    isUserInteraction: boolean,
    baseline?: { prevSize: number; nextSize: number }
  ) {
    const pair = getPairConfig(separatorIndex)
    if (!pair) return
    setLayout((prevLayout) => {
      const { prev, next } = pair
      const prevSize = baseline ? baseline.prevSize : (prevLayout[prev.id] ?? 0)
      const nextSize = baseline ? baseline.nextSize : (prevLayout[next.id] ?? 0)
      const [newPrev, newNext] = clampPairDelta(prevSize, nextSize, prev, next, deltaPercent)
      return commitLayout({ ...prevLayout, [prev.id]: newPrev, [next.id]: newNext }, isUserInteraction)
    })
  }

  function resetPair(separatorIndex: number) {
    const pair = getPairConfig(separatorIndex)
    if (!pair) return
    const { prev, next } = pair
    setLayout((prevLayout) => {
      const prevSize = prevLayout[prev.id] ?? 0
      const nextSize = prevLayout[next.id] ?? 0
      let delta: number
      if (prev.defaultSize !== undefined) delta = prev.defaultSize - prevSize
      else if (next.defaultSize !== undefined) delta = nextSize - next.defaultSize
      else return prevLayout
      const [newPrev, newNext] = clampPairDelta(prevSize, nextSize, prev, next, delta)
      return commitLayout({ ...prevLayout, [prev.id]: newPrev, [next.id]: newNext }, true)
    })
  }

  function toggleCollapse(separatorIndex: number) {
    const pair = getPairConfig(separatorIndex)
    if (!pair?.prev.collapsible) return
    const { prev, next } = pair
    setLayout((prevLayout) => {
      const prevSize = prevLayout[prev.id] ?? 0
      const nextSize = prevLayout[next.id] ?? 0
      const isCollapsed = prevSize <= prev.collapsedSize + 0.01
      const delta = isCollapsed
        ? (expandedSizeRef.current[prev.id] ?? prev.defaultSize ?? Math.max(prev.minSize, 10)) - prevSize
        : prev.collapsedSize - prevSize
      if (!isCollapsed) expandedSizeRef.current[prev.id] = prevSize
      const [newPrev, newNext] = clampPairDelta(prevSize, nextSize, prev, next, delta)
      return commitLayout({ ...prevLayout, [prev.id]: newPrev, [next.id]: newNext }, true)
    })
  }

  const contextValue: GroupContextValue = {
    orientation,
    layout,
    groupDisabled: disabled,
    groupElRef,
    resizePair,
    resetPair,
    toggleCollapse,
    getPairConfig,
  }

  return (
    <ResizableGroupContext.Provider value={contextValue}>
      <div
        ref={groupElRef}
        data-slot="resizable-panel-group"
        aria-orientation={orientation}
        data-group=""
        className={cn(
          "flex h-full w-full aria-[orientation=vertical]:flex-col",
          className
        )}
        style={{ overflow: "hidden", touchAction: orientation === "horizontal" ? "pan-y" : "pan-x", ...style }}
        {...props}
      >
        {processed}
      </div>
    </ResizableGroupContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

type ResizablePanelProps = Omit<ComponentProps<"div">, "onResize"> & {
  id?: string | number
  defaultSize?: number | string
  minSize?: number | string
  maxSize?: number | string
  collapsible?: boolean
  collapsedSize?: number | string
  disabled?: boolean
  onResize?: (size: number, id: string | undefined, prevSize: number | undefined) => void
  /** Injected by ResizablePanelGroup - not part of the public API. */
  resolvedId?: string
}

function ResizablePanel({
  id: _id,
  defaultSize: _defaultSize,
  minSize: _minSize,
  maxSize: _maxSize,
  collapsible: _collapsible,
  collapsedSize: _collapsedSize,
  disabled,
  onResize,
  resolvedId,
  className,
  style,
  children,
  ...props
}: ResizablePanelProps) {
  const { layout } = useResizableGroup()
  const size = resolvedId ? (layout[resolvedId] ?? 0) : 0
  const prevSizeRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prevSizeRef.current !== undefined && prevSizeRef.current !== size) {
      onResize?.(size, resolvedId, prevSizeRef.current)
    }
    prevSizeRef.current = size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  return (
    <div
      data-slot="resizable-panel"
      data-panel=""
      id={resolvedId}
      data-disabled={disabled ? "" : undefined}
      style={{
        display: "flex",
        flexBasis: 0,
        flexGrow: size,
        flexShrink: 1,
        overflow: "visible",
        minWidth: 0,
        minHeight: 0,
        maxWidth: "100%",
        maxHeight: "100%",
      }}
    >
      <div
        className={cn("min-w-0 min-h-0 flex-1 overflow-auto", className)}
        style={{ maxWidth: "100%", maxHeight: "100%", ...style }}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Handle / Separator
// ---------------------------------------------------------------------------

type ResizableHandleProps = ComponentProps<"div"> & {
  withHandle?: boolean
  disabled?: boolean
  disableDoubleClick?: boolean
  /** Injected by ResizablePanelGroup - not part of the public API. */
  separatorIndex?: number
}

function ResizableHandle({
  withHandle,
  disabled,
  disableDoubleClick,
  separatorIndex,
  className,
  onPointerDown: onPointerDownProp,
  onKeyDown: onKeyDownProp,
  onDoubleClick: onDoubleClickProp,
  ...props
}: ResizableHandleProps) {
  const group = useResizableGroup()
  const [isDragging, setIsDragging] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startClient: number
    groupSize: number
    startPrev: number
    startNext: number
  } | null>(null)

  const isDisabled = disabled || group.groupDisabled
  const separatorAriaOrientation = group.orientation === "horizontal" ? "vertical" : "horizontal"
  const pair = separatorIndex !== undefined ? group.getPairConfig(separatorIndex) : null

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerDownProp?.(event)
    if (isDisabled || separatorIndex === undefined || !pair) return
    const groupEl = group.groupElRef.current
    if (!groupEl) return
    const rect = groupEl.getBoundingClientRect()
    const groupSize = group.orientation === "horizontal" ? rect.width : rect.height
    dragRef.current = {
      pointerId: event.pointerId,
      startClient: group.orientation === "horizontal" ? event.clientX : event.clientY,
      groupSize,
      startPrev: group.layout[pair.prev.id] ?? 0,
      startNext: group.layout[pair.next.id] ?? 0,
    }
    setIsDragging(true)
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId || separatorIndex === undefined) return
    const clientPos = group.orientation === "horizontal" ? event.clientX : event.clientY
    const deltaPercent = drag.groupSize > 0 ? ((clientPos - drag.startClient) / drag.groupSize) * 100 : 0
    group.resizePair(separatorIndex, deltaPercent, false, { prevSize: drag.startPrev, nextSize: drag.startNext })
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (separatorIndex !== undefined) {
      group.resizePair(separatorIndex, 0, true)
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDownProp?.(event)
    if (isDisabled || separatorIndex === undefined || event.defaultPrevented) return
    const horizontal = group.orientation === "horizontal"
    if (horizontal && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      group.resizePair(separatorIndex, event.key === "ArrowRight" ? KEYBOARD_STEP : -KEYBOARD_STEP, true)
    } else if (!horizontal && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault()
      group.resizePair(separatorIndex, event.key === "ArrowDown" ? KEYBOARD_STEP : -KEYBOARD_STEP, true)
    } else if (event.key === "Home") {
      event.preventDefault()
      group.resizePair(separatorIndex, -100, true)
    } else if (event.key === "End") {
      event.preventDefault()
      group.resizePair(separatorIndex, 100, true)
    } else if (event.key === "Enter") {
      event.preventDefault()
      group.toggleCollapse(separatorIndex)
    }
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    onDoubleClickProp?.(event)
    if (isDisabled || disableDoubleClick || separatorIndex === undefined) return
    group.resetPair(separatorIndex)
  }

  const state = isDisabled ? "disabled" : isDragging ? "active" : isFocused ? "focus" : isHovered ? "hover" : "inactive"

  const ariaNow = pair ? Math.round((group.layout[pair.prev.id] ?? 0) * 100) / 100 : undefined

  return (
    <div
      role="separator"
      data-slot="resizable-handle"
      data-separator={state}
      aria-orientation={separatorAriaOrientation}
      aria-disabled={isDisabled || undefined}
      aria-controls={pair?.prev.id}
      aria-valuenow={ariaNow}
      aria-valuemin={pair?.prev.minSize}
      aria-valuemax={pair?.prev.maxSize}
      tabIndex={isDisabled ? undefined : 0}
      className={cn(
        "relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      style={{ cursor: isDisabled ? "not-allowed" : group.orientation === "horizontal" ? "col-resize" : "row-resize" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
      )}
    </div>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
export type { ResizableHandleProps, ResizablePanelGroupProps, ResizablePanelProps }

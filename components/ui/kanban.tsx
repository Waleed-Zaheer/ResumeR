"use client"

/**
 * Kanban — a drag-and-drop ticket board: columns represent statuses, cards
 * represent tickets. Dragging a card over a column (and a position within
 * it) and releasing moves it there; the board's grouping updates and
 * `onValueChange` fires. Works controlled (own the `value` map yourself) or
 * uncontrolled (`defaultValue`, board state lives inside `Kanban`).
 *
 * Cards are authored once, nested under their *initial* column - `Kanban`
 * scans that tree once to build a lookup of every `<KanbanCard>` by id plus
 * the column each was declared under (seeding uncontrolled state), then on
 * every render re-clones the tree so each `<KanbanColumnList>` shows the
 * cards the current board value actually assigns to it, in order. This is
 * the same scan-then-clone approach `resizable.tsx` uses for panels/handles,
 * generalized so a card's rendered position always matches its true column
 * regardless of where it was originally written in JSX.
 *
 * Dragging uses Pointer Events (not HTML5 drag-and-drop) - project
 * convention, see `resizable.tsx`. The dragged card is pinned with
 * `position: fixed` under the pointer; other cards don't reflow mid-drag,
 * a thin indicator line shows where it will land, and the move only
 * commits on pointer-up. Arrow keys on a focused card reorder/move it
 * between columns without a mouse.
 *
 * Usage:
 *   <Kanban defaultValue={{ todo: ["t1"], done: ["t2"] }}>
 *     <KanbanBoard>
 *       <KanbanColumn id="todo">
 *         <KanbanColumnHeader>
 *           <KanbanColumnTitle>To do</KanbanColumnTitle>
 *           <KanbanColumnCount />
 *         </KanbanColumnHeader>
 *         <KanbanColumnList>
 *           <KanbanCard id="t1">Fix the bug</KanbanCard>
 *         </KanbanColumnList>
 *       </KanbanColumn>
 *       <KanbanColumn id="done">
 *         <KanbanColumnHeader>
 *           <KanbanColumnTitle>Done</KanbanColumnTitle>
 *           <KanbanColumnCount />
 *         </KanbanColumnHeader>
 *         <KanbanColumnList>
 *           <KanbanCard id="t2">Ship it</KanbanCard>
 *         </KanbanColumnList>
 *       </KanbanColumn>
 *     </KanbanBoard>
 *   </Kanban>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
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
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"

/** Column id -> ordered list of card ids currently in that column. */
type KanbanValue = Record<string, string[]>

type DragState = {
  cardId: string
  pointerId: number
  offsetX: number
  offsetY: number
  width: number
  x: number
  y: number
} | null

type OverState = { columnId: string; index: number; top: number } | null

type KanbanContextValue = {
  board: KanbanValue
  disabled?: boolean
  drag: DragState
  over: OverState
  columnOrder: string[]
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void
  startDrag: (info: NonNullable<DragState>) => void
  updateDragPosition: (cardId: string, x: number, y: number) => void
  endDrag: () => void
  cancelDrag: () => void
  registerColumn: (columnId: string, el: HTMLElement | null) => void
  registerCard: (cardId: string, el: HTMLElement | null) => void
  lastMovedId: string | null
  clearLastMoved: () => void
}

const KanbanContext = createContext<KanbanContextValue | null>(null)

function useKanbanContext() {
  const context = useContext(KanbanContext)
  if (!context) throw new Error("Kanban components must be used within a <Kanban />")
  return context
}

const KanbanColumnContext = createContext<{ columnId: string } | null>(null)

function useKanbanColumnContext() {
  const context = useContext(KanbanColumnContext)
  if (!context) throw new Error("KanbanColumnList/KanbanCard must be used within a <KanbanColumn />")
  return context
}

/** Walks the authored tree once to find every `<KanbanCard>` (by id) and
 * the `<KanbanColumn>` each was declared under - used to build the card
 * lookup and the uncontrolled default/reconciliation grouping. */
function scanChildren(children: ReactNode) {
  const registry = new Map<string, ReactElement>()
  const board: KanbanValue = {}
  const columnOrder: string[] = []

  function walk(node: ReactNode, columnId: string | null) {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return

      if (child.type === KanbanColumn) {
        const props = child.props as { id: string; children?: ReactNode }
        const childColumnId = String(props.id)
        if (!columnOrder.includes(childColumnId)) columnOrder.push(childColumnId)
        board[childColumnId] = board[childColumnId] ?? []
        walk(props.children, childColumnId)
        return
      }

      if (child.type === KanbanCard) {
        const props = child.props as { id: string }
        const cardId = String(props.id)
        registry.set(cardId, child)
        if (columnId) board[columnId] = [...(board[columnId] ?? []), cardId]
        return
      }

      const props = child.props as { children?: ReactNode }
      if (props?.children) walk(props.children, columnId)
    })
  }

  walk(children, null)
  return { registry, board, columnOrder }
}

/** Re-clones the authored tree, replacing each `<KanbanColumnList>`'s
 * children with the cards `board` currently assigns to its column, in
 * board order - so rendered position always reflects the real grouping. */
function renderBoard(
  node: ReactNode,
  columnId: string | null,
  board: KanbanValue,
  registry: Map<string, ReactElement>
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child

    if (child.type === KanbanColumn) {
      const props = child.props as { id: string; children?: ReactNode }
      const childColumnId = String(props.id)
      return cloneElement(child, undefined, renderBoard(props.children, childColumnId, board, registry))
    }

    if (child.type === KanbanColumnList) {
      if (!columnId) return child
      const cards = (board[columnId] ?? [])
        .map((cardId) => registry.get(cardId))
        .filter((el): el is ReactElement => Boolean(el))
      return cloneElement(child, undefined, cards)
    }

    if (child.type === KanbanCard) return child

    const props = child.props as { children?: ReactNode }
    if (props?.children) {
      return cloneElement(child, undefined, renderBoard(props.children, columnId, board, registry))
    }
    return child
  })
}

function Kanban({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "children" | "value" | "defaultValue"> & {
  value?: KanbanValue
  defaultValue?: KanbanValue
  onValueChange?: (value: KanbanValue) => void
  disabled?: boolean
  children?: ReactNode
}) {
  const { registry, board: scannedBoard, columnOrder } = useMemo(() => scanChildren(children), [children])

  const [board, setBoard] = useControllableState<KanbanValue>({
    prop: valueProp,
    defaultProp: defaultValue ?? scannedBoard,
    onChange: onValueChange,
  })

  const [drag, setDrag] = useState<DragState>(null)
  const [over, setOver] = useState<OverState>(null)
  const [lastMovedId, setLastMovedId] = useState<string | null>(null)
  const columnElsRef = useRef(new Map<string, HTMLElement>())
  const cardElsRef = useRef(new Map<string, HTMLElement>())

  // Keeps board in sync when the authored cards/columns themselves change
  // (added/removed) - drops stale ids, appends new ones under their
  // scanned column. Reconciles by id-set, so it's a no-op while just
  // dragging (board reference is returned unchanged, no re-render).
  const reconcileKey = `${columnOrder.join(",")}|${Array.from(registry.keys()).join(",")}`
  useEffect(() => {
    setBoard((prev) => {
      const registryIds = new Set(registry.keys())
      const placed = new Set<string>()
      const next: KanbanValue = {}
      for (const columnId of columnOrder) {
        next[columnId] = (prev[columnId] ?? []).filter((id) => registryIds.has(id))
        next[columnId].forEach((id) => placed.add(id))
      }
      for (const columnId of columnOrder) {
        for (const id of scannedBoard[columnId] ?? []) {
          if (!placed.has(id)) {
            next[columnId] = [...next[columnId], id]
            placed.add(id)
          }
        }
      }
      const unchanged =
        columnOrder.every((id) => (next[id] ?? []).join(",") === (prev[id] ?? []).join(",")) &&
        Object.keys(prev).every((id) => id in next)
      return unchanged ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileKey])

  function moveCard(cardId: string, toColumnId: string, toIndex: number) {
    setBoard((prev) => {
      const next: KanbanValue = {}
      for (const key in prev) next[key] = prev[key].filter((id) => id !== cardId)
      const list = [...(next[toColumnId] ?? [])]
      list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, cardId)
      next[toColumnId] = list
      return next
    })
    setLastMovedId(cardId)
  }

  function computeOver(cardId: string, clientX: number, clientY: number): OverState {
    let bestColumnId: string | null = null
    let bestDist = Infinity
    for (const [columnId, el] of columnElsRef.current) {
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        bestColumnId = columnId
        bestDist = 0
        break
      }
      const dist = clientX < rect.left ? rect.left - clientX : clientX - rect.right
      if (dist < bestDist) {
        bestDist = dist
        bestColumnId = columnId
      }
    }
    if (!bestColumnId) return null
    const columnEl = columnElsRef.current.get(bestColumnId)
    if (!columnEl) return null
    const columnRect = columnEl.getBoundingClientRect()
    const ids = (board[bestColumnId] ?? []).filter((id) => id !== cardId)

    let index = ids.length
    let top = 8
    for (let i = 0; i < ids.length; i++) {
      const el = cardElsRef.current.get(ids[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        index = i
        top = rect.top - columnRect.top
        break
      }
      top = rect.bottom - columnRect.top
    }

    return { columnId: bestColumnId, index, top }
  }

  function registerColumn(columnId: string, el: HTMLElement | null) {
    if (el) columnElsRef.current.set(columnId, el)
    else columnElsRef.current.delete(columnId)
  }
  function registerCard(cardId: string, el: HTMLElement | null) {
    if (el) cardElsRef.current.set(cardId, el)
    else cardElsRef.current.delete(cardId)
  }

  function startDrag(info: NonNullable<DragState>) {
    if (disabled) return
    setDrag(info)
    setOver(computeOver(info.cardId, info.x, info.y))
  }
  function updateDragPosition(cardId: string, x: number, y: number) {
    if (!drag || drag.cardId !== cardId) return
    setDrag({ ...drag, x, y })
    setOver(computeOver(cardId, x, y))
  }
  function endDrag() {
    if (drag && over) moveCard(drag.cardId, over.columnId, over.index)
    setDrag(null)
    setOver(null)
  }
  function cancelDrag() {
    setDrag(null)
    setOver(null)
  }
  function clearLastMoved() {
    setLastMovedId(null)
  }

  useEffect(() => {
    if (!drag) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancelDrag()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const contextValue: KanbanContextValue = {
    board,
    disabled,
    drag,
    over,
    columnOrder,
    moveCard,
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
    registerColumn,
    registerCard,
    lastMovedId,
    clearLastMoved,
  }

  return (
    <KanbanContext.Provider value={contextValue}>
      <div data-slot="kanban" className={cn("w-full", className)} {...props}>
        {renderBoard(children, null, board, registry)}
      </div>
    </KanbanContext.Provider>
  )
}

function KanbanBoard({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="kanban-board"
      className={cn("flex w-full items-start gap-4 overflow-x-auto pb-2", className)}
      {...props}
    />
  )
}

function KanbanColumn({
  id,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { id: string }) {
  const { drag, over } = useKanbanContext()
  const isOver = Boolean(drag) && over?.columnId === id

  return (
    <KanbanColumnContext.Provider value={{ columnId: id }}>
      <div
        data-slot="kanban-column"
        data-over={isOver ? "" : undefined}
        className={cn(
          "flex w-72 shrink-0 flex-col gap-2 rounded-3xl bg-muted/40 p-3 ring-1 ring-foreground/5 transition-colors data-over:bg-muted/70 data-over:ring-primary/30",
          className
        )}
        {...props}
      />
    </KanbanColumnContext.Provider>
  )
}

function KanbanColumnHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="kanban-column-header"
      className={cn("flex items-center justify-between gap-2 px-1 pb-1", className)}
      {...props}
    />
  )
}

function KanbanColumnTitle({ className, ...props }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      data-slot="kanban-column-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function KanbanColumnCount({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  const { columnId } = useKanbanColumnContext()
  const { board } = useKanbanContext()
  const count = (board[columnId] ?? []).length

  return (
    <span
      data-slot="kanban-column-count"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/5",
        className
      )}
      {...props}
    >
      {count}
    </span>
  )
}

function KanbanColumnList({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  const { columnId } = useKanbanColumnContext()
  const { registerColumn, drag, over } = useKanbanContext()
  const ref = useRef<HTMLDivElement | null>(null)
  const showIndicator = Boolean(drag) && over?.columnId === columnId

  useEffect(() => {
    registerColumn(columnId, ref.current)
    return () => registerColumn(columnId, null)
  })

  return (
    <div
      ref={ref}
      data-slot="kanban-column-list"
      className={cn("relative flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto", className)}
      {...props}
    >
      {children}
      {showIndicator && over && (
        <div
          className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ top: over.top }}
        />
      )}
    </div>
  )
}

function KanbanCard({
  id,
  disabled,
  className,
  children,
  onPointerDown: onPointerDownProp,
  onKeyDown: onKeyDownProp,
  ...props
}: ComponentPropsWithoutRef<"div"> & { id: string; disabled?: boolean }) {
  const { columnId } = useKanbanColumnContext()
  const {
    board,
    disabled: groupDisabled,
    drag,
    startDrag,
    updateDragPosition,
    endDrag,
    cancelDrag,
    moveCard,
    columnOrder,
    registerCard,
    lastMovedId,
    clearLastMoved,
  } = useKanbanContext()
  const ref = useRef<HTMLDivElement | null>(null)
  const isDisabled = disabled || groupDisabled
  const isDragging = drag?.cardId === id

  useEffect(() => {
    registerCard(id, ref.current)
    return () => registerCard(id, null)
  })

  useEffect(() => {
    if (lastMovedId === id) {
      ref.current?.focus({ preventScroll: true })
      clearLastMoved()
    }
  }, [lastMovedId, id, clearLastMoved])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerDownProp?.(event)
    if (isDisabled || event.defaultPrevented || event.button !== 0) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.setPointerCapture(event.pointerId)
    startDrag({
      cardId: id,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging || event.pointerId !== drag?.pointerId) return
    updateDragPosition(id, event.clientX, event.clientY)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging || event.pointerId !== drag?.pointerId) return
    endDrag()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDownProp?.(event)
    if (isDisabled || event.defaultPrevented) return
    const list = board[columnId] ?? []
    const index = list.indexOf(id)
    if (event.key === "Escape" && isDragging) {
      event.preventDefault()
      cancelDrag()
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault()
      moveCard(id, columnId, index - 1)
    } else if (event.key === "ArrowDown" && index >= 0 && index < list.length - 1) {
      event.preventDefault()
      moveCard(id, columnId, index + 1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const columnPos = columnOrder.indexOf(columnId)
      const targetColumnId = columnOrder[event.key === "ArrowLeft" ? columnPos - 1 : columnPos + 1]
      if (!targetColumnId) return
      moveCard(id, targetColumnId, Math.min(index === -1 ? 0 : index, (board[targetColumnId] ?? []).length))
    }
  }

  const style: CSSProperties | undefined =
    isDragging && drag
      ? { position: "fixed", left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, zIndex: 50 }
      : undefined

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-roledescription="draggable ticket"
      aria-disabled={isDisabled || undefined}
      data-slot="kanban-card"
      data-dragging={isDragging ? "" : undefined}
      data-disabled={isDisabled ? "" : undefined}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-grab touch-none rounded-2xl border bg-card p-3 text-left text-sm shadow-sm ring-1 ring-foreground/5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing data-dragging:shadow-lg data-dragging:ring-2 data-dragging:ring-primary/40 data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHeader,
  KanbanColumnTitle,
  KanbanColumnCount,
  KanbanColumnList,
  KanbanCard,
}
export type { KanbanValue }

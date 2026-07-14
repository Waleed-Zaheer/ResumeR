"use client"

/**
 * MessageScroller — a chat-style scrollable message list that sticks to
 * the bottom as new messages arrive, but stops auto-scrolling the moment
 * the user manually scrolls away (wheel/touch/arrow keys), re-engaging
 * once they scroll back to the bottom themselves or click the
 * scroll-to-end button. Also tracks scrollable-edge state (to show/hide
 * scroll buttons) and briefly flags `data-autoscrolling` during
 * programmatic scrolls (used to hide the scrollbar thumb while
 * auto-following, see the Viewport className).
 *
 * Feature scope: fully implemented and verified for the common case -
 * appending new items with autoScroll on/off, initial scroll position,
 * and the scroll-to-end/start buttons. `scrollAnchor` items (pinning a
 * specific message near the top of the viewport instead of scrolling all
 * the way down - useful for keeping a new user message in view while its
 * response streams in below) and `preserveScrollOnPrepend` (keeping
 * scroll position stable when older messages are loaded above) are wired
 * up and functional, but are a best-effort port rather than a
 * verified-identical reimplementation of a considerably more involved
 * multi-mode scroll state machine - no demo in this project currently
 * exercises them.
 *
 * Usage:
 *   <MessageScrollerProvider autoScroll defaultScrollPosition="end">
 *     <MessageScroller className="h-96">
 *       <MessageScrollerViewport>
 *         <MessageScrollerContent>
 *           {messages.map((m) => (
 *             <MessageScrollerItem key={m.id} messageId={m.id}>{m.text}</MessageScrollerItem>
 *           ))}
 *         </MessageScrollerContent>
 *       </MessageScrollerViewport>
 *       <MessageScrollerButton />
 *     </MessageScroller>
 *   </MessageScrollerProvider>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-render.ts, merge-props.ts (the `render` prop, ref merging - MessageScrollerButton only)
 *   - src/components/ui/button.tsx (MessageScrollerButton's default render)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { mergeRefs } from "@/lib/primitives/merge-props"
import { useRender } from "@/lib/primitives/use-render"
import { Button } from "@/components/ui/button"
import { ArrowDownIcon } from "lucide-react"

type ScrollAlign = "start" | "center" | "end" | "nearest"
type ScrollOptions = { align?: ScrollAlign; behavior?: ScrollBehavior; scrollMargin?: number }
type Scrollable = { start: boolean; end: boolean }
type Direction = "start" | "end"
type DefaultScrollPosition = "start" | "end" | "last-anchor"
type VisibilityState = { currentAnchorId: string | null; visibleMessageIds: string[] }

const DEFAULT_SCROLL_EDGE_THRESHOLD = 8
const DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK = 64
const DEFAULT_SCROLL_MARGIN = 0
const POSITION_EPSILON = 0.5
const AUTOSCROLLING_SETTLE_MS = 180
const USER_SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "])

function createStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => state,
    setSnapshot(next: T) {
      state = next
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
type Store<T> = ReturnType<typeof createStore<T>>

function getContentItems(content: HTMLElement, spacer: HTMLElement | null): HTMLElement[] {
  return Array.from(content.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== spacer
  )
}

function computeScrollable(viewport: HTMLElement, threshold: number): Scrollable {
  return {
    start: viewport.scrollTop > threshold,
    end: viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > threshold,
  }
}

function computeScrollTopForElement(
  element: HTMLElement,
  viewport: HTMLElement,
  align: ScrollAlign,
  scrollMargin: number
): number {
  const elRect = element.getBoundingClientRect()
  const vpRect = viewport.getBoundingClientRect()
  const elTop = elRect.top - vpRect.top + viewport.scrollTop
  if (align === "center") return elTop - (viewport.clientHeight - elRect.height) / 2
  if (align === "end") return elTop - viewport.clientHeight + elRect.height + scrollMargin
  if (align === "nearest") {
    const viewTop = viewport.scrollTop
    const viewBottom = viewport.scrollTop + viewport.clientHeight
    if (elTop >= viewTop && elTop + elRect.height <= viewBottom) return viewport.scrollTop
    return elTop < viewTop ? elTop - scrollMargin : elTop + elRect.height - viewport.clientHeight + scrollMargin
  }
  return elTop - scrollMargin
}

type MessageScrollerContextValue = {
  scrollableStore: Store<Scrollable>
  visibilityStore: Store<VisibilityState>
  scrollToEnd: (options?: { behavior?: ScrollBehavior }) => boolean
  scrollToStart: (options?: { behavior?: ScrollBehavior }) => boolean
  scrollToMessage: (messageId: string, options?: ScrollOptions) => boolean
  setRootElement: (el: HTMLDivElement | null) => void
  setViewportElement: (el: HTMLDivElement | null) => void
  setContentElement: (el: HTMLDivElement | null) => void
  setSpacerElement: (el: HTMLDivElement | null) => void
  handleScroll: () => void
  handleUserScrollIntent: () => void
  handleResize: () => void
  handleContentChange: () => void
  preserveScrollOnPrependRef: React.RefObject<boolean>
  observeItemVisibility: (el: HTMLElement) => void
  unobserveItemVisibility: (el: HTMLElement) => void
}

const MessageScrollerContext = createContext<MessageScrollerContextValue | null>(null)

function useMessageScrollerContext() {
  const context = useContext(MessageScrollerContext)
  if (!context) throw new Error("useMessageScroller must be used within a MessageScroller.")
  return context
}

type RegisterMessage = (
  messageId: string | undefined,
  el: HTMLDivElement | null,
  prevEl: HTMLDivElement | null
) => void
const MessageRegistryContext = createContext<RegisterMessage | null>(null)

function useRegisterMessage() {
  const context = useContext(MessageRegistryContext)
  if (!context) throw new Error("MessageScrollerItem must be used within a MessageScroller.")
  return context
}

function useMessageScrollerState({
  autoScroll,
  defaultScrollPosition,
  scrollEdgeThreshold,
  scrollPreviousItemPeek,
  scrollMargin,
}: {
  autoScroll: boolean
  defaultScrollPosition: DefaultScrollPosition
  scrollEdgeThreshold: number
  scrollPreviousItemPeek: number
  scrollMargin: number
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const spacerRef = useRef<HTMLDivElement | null>(null)

  const autoScrollRef = useRef(autoScroll)
  autoScrollRef.current = autoScroll
  const followingBottomRef = useRef(autoScroll)
  const autoscrollingRef = useRef(false)
  const autoscrollingTimeoutRef = useRef<number | null>(null)
  const defaultPositionAppliedRef = useRef(false)
  const messageElementsRef = useRef(new Map<string, HTMLElement>())
  const preserveScrollOnPrependRef = useRef(true)
  const prevItemsRef = useRef<HTMLElement[]>([])
  const prevFirstTopRef = useRef<number | null>(null)
  const seenAnchorIdsRef = useRef(new Set<string>())
  const visibleIdsRef = useRef(new Set<string>())
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  const scrollableStore = useMemo(() => createStore<Scrollable>({ start: false, end: false }), [])
  const visibilityStore = useMemo(
    () => createStore<VisibilityState>({ currentAnchorId: null, visibleMessageIds: [] }),
    []
  )

  const syncAttributes = useCallback(() => {
    const { start, end } = scrollableStore.getSnapshot()
    const value = [start && "start", end && "end"].filter(Boolean).join(" ")
    for (const el of [rootRef.current, viewportRef.current]) {
      if (!el) continue
      if (value) el.setAttribute("data-scrollable", value)
      else el.removeAttribute("data-scrollable")
      el.toggleAttribute("data-autoscrolling", autoscrollingRef.current)
    }
  }, [scrollableStore])

  const setAutoscrolling = useCallback(
    (value: boolean) => {
      if (autoscrollingTimeoutRef.current !== null) {
        window.clearTimeout(autoscrollingTimeoutRef.current)
        autoscrollingTimeoutRef.current = null
      }
      if (autoscrollingRef.current !== value) {
        autoscrollingRef.current = value
        syncAttributes()
      }
      if (value) {
        autoscrollingTimeoutRef.current = window.setTimeout(() => {
          autoscrollingTimeoutRef.current = null
          autoscrollingRef.current = false
          syncAttributes()
        }, AUTOSCROLLING_SETTLE_MS)
      }
    },
    [syncAttributes]
  )

  const syncScrollable = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const next = computeScrollable(viewport, scrollEdgeThreshold)
    if (autoScrollRef.current && !next.end) followingBottomRef.current = true
    else if (followingBottomRef.current && next.end && !autoscrollingRef.current) followingBottomRef.current = false
    scrollableStore.setSnapshot(next)
    syncAttributes()
  }, [scrollEdgeThreshold, scrollableStore, syncAttributes])

  const scrollTo = useCallback(
    (top: number, { behavior = "auto", autoscrolling = false }: { behavior?: ScrollBehavior; autoscrolling?: boolean } = {}) => {
      const viewport = viewportRef.current
      if (!viewport) return
      const clamped = Math.max(0, top)
      if (Math.abs(viewport.scrollTop - clamped) <= POSITION_EPSILON) {
        viewport.scrollTop = clamped
        syncScrollable()
        return
      }
      if (autoscrolling) setAutoscrolling(true)
      viewport.scrollTo({ top: clamped, behavior })
    },
    [setAutoscrolling, syncScrollable]
  )

  const scrollToEnd = useCallback(
    ({ behavior = "auto" }: { behavior?: ScrollBehavior } = {}) => {
      const viewport = viewportRef.current
      if (!viewport) return false
      followingBottomRef.current = autoScrollRef.current
      scrollTo(viewport.scrollHeight, { autoscrolling: true, behavior })
      return true
    },
    [scrollTo]
  )

  const scrollToStart = useCallback(
    ({ behavior = "auto" }: { behavior?: ScrollBehavior } = {}) => {
      if (!viewportRef.current) return false
      followingBottomRef.current = false
      scrollTo(0, { autoscrolling: true, behavior })
      return true
    },
    [scrollTo]
  )

  const scrollToElement = useCallback(
    (element: HTMLElement, options: ScrollOptions = {}) => {
      const viewport = viewportRef.current
      if (!viewport || !element.isConnected) return false
      const top = computeScrollTopForElement(
        element,
        viewport,
        options.align ?? "start",
        options.scrollMargin ?? scrollMargin
      )
      scrollTo(top, { autoscrolling: true, behavior: options.behavior ?? "auto" })
      return true
    },
    [scrollMargin, scrollTo]
  )

  const scrollToMessage = useCallback(
    (messageId: string, options: ScrollOptions = {}) => {
      const el = messageElementsRef.current.get(messageId)
      if (!el) return false
      followingBottomRef.current = false
      return scrollToElement(el, options)
    },
    [scrollToElement]
  )

  const applyDefaultScrollPosition = useCallback(() => {
    if (defaultPositionAppliedRef.current) return
    const content = contentRef.current
    const viewport = viewportRef.current
    if (!content || !viewport) return
    if (content.children.length === 0) return
    if (defaultScrollPosition === "start") scrollToStart()
    else if (defaultScrollPosition === "last-anchor") {
      const items = getContentItems(content, spacerRef.current)
      const lastAnchor = [...items].reverse().find((el) => el.dataset.scrollAnchor === "true")
      if (lastAnchor) scrollToElement(lastAnchor, { align: "start" })
      else scrollToEnd()
    } else scrollToEnd()
    defaultPositionAppliedRef.current = true
  }, [defaultScrollPosition, scrollToElement, scrollToEnd, scrollToStart])

  const handleScroll = useCallback(() => {
    syncScrollable()
    const content = contentRef.current
    if (content) {
      const first = getContentItems(content, spacerRef.current)[0] ?? null
      prevFirstTopRef.current = first ? first.getBoundingClientRect().top : null
    }
  }, [syncScrollable])

  const handleUserScrollIntent = useCallback(() => {
    followingBottomRef.current = false
  }, [])

  const handleResize = useCallback(() => {
    if (followingBottomRef.current) scrollToEnd()
    else syncScrollable()
  }, [scrollToEnd, syncScrollable])

  const setSpacerHeight = useCallback((height: number) => {
    const spacer = spacerRef.current
    if (!spacer) return
    const clamped = Math.max(0, Math.round(height))
    spacer.style.height = `${clamped}px`
    spacer.hidden = clamped === 0
  }, [])

  const handleContentChange = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const spacer = spacerRef.current
    const items = getContentItems(content, spacer)
    const prevItems = prevItemsRef.current
    const viewport = viewportRef.current

    if (items.length > prevItems.length && prevItems.length > 0 && viewport) {
      const appendedAtEnd = prevItems.every((el, i) => items[i] === el)
      const prependedAtStart = prevItems.every(
        (el, i) => items[items.length - prevItems.length + i] === el
      )
      if (appendedAtEnd) {
        const newItems = items.slice(prevItems.length)
        const anchor = newItems.find(
          (el) => el.dataset.scrollAnchor === "true" && el.dataset.messageId && !seenAnchorIdsRef.current.has(el.dataset.messageId)
        )
        if (anchor?.dataset.messageId) {
          seenAnchorIdsRef.current.add(anchor.dataset.messageId)
          if (followingBottomRef.current) {
            setSpacerHeight(Math.max(0, viewport.clientHeight - anchor.offsetHeight - scrollPreviousItemPeek))
            scrollToElement(anchor, { align: "start", scrollMargin })
            followingBottomRef.current = false
          }
        } else if (followingBottomRef.current) {
          scrollToEnd()
        }
      } else if (prependedAtStart && preserveScrollOnPrependRef.current) {
        const prevFirst = prevItems[0]
        const prevTop = prevFirstTopRef.current
        if (prevFirst?.isConnected && prevTop !== null) {
          const delta = prevFirst.getBoundingClientRect().top - prevTop
          if (Math.abs(delta) > POSITION_EPSILON) viewport.scrollTop += delta
        }
      }
    }

    prevItemsRef.current = items
    const newFirst = items[0] ?? null
    prevFirstTopRef.current = newFirst ? newFirst.getBoundingClientRect().top : null
    syncScrollable()
  }, [scrollMargin, scrollPreviousItemPeek, scrollToElement, scrollToEnd, syncScrollable, setSpacerHeight])

  const recomputeVisibility = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const spacer = spacerRef.current
    const viewport = viewportRef.current
    const visible: string[] = []
    let currentAnchorId: string | null = null
    const vpRect = viewport?.getBoundingClientRect()
    const anchorLine = vpRect ? vpRect.top + scrollMargin + scrollPreviousItemPeek : 0
    for (const el of getContentItems(content, spacer)) {
      const id = el.dataset.messageId
      if (!id) continue
      if (visibleIdsRef.current.has(id)) visible.push(id)
      if (el.dataset.scrollAnchor === "true") {
        const rect = el.getBoundingClientRect()
        if (rect.top <= anchorLine + POSITION_EPSILON) currentAnchorId = id
      }
    }
    visibilityStore.setSnapshot({ currentAnchorId, visibleMessageIds: visible })
  }, [scrollMargin, scrollPreviousItemPeek, visibilityStore])

  const observeItemVisibility = useCallback(
    (el: HTMLElement) => {
      if (!intersectionObserverRef.current) {
        const viewport = viewportRef.current
        if (!viewport || typeof IntersectionObserver === "undefined") return
        intersectionObserverRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const id = (entry.target as HTMLElement).dataset.messageId
              if (!id) continue
              if (entry.isIntersecting) visibleIdsRef.current.add(id)
              else visibleIdsRef.current.delete(id)
            }
            recomputeVisibility()
          },
          { root: viewport, threshold: [0, 0.01, 0.5, 1] }
        )
      }
      intersectionObserverRef.current.observe(el)
    },
    [recomputeVisibility]
  )

  const unobserveItemVisibility = useCallback((el: HTMLElement) => {
    intersectionObserverRef.current?.unobserve(el)
    const id = el.dataset.messageId
    if (id) visibleIdsRef.current.delete(id)
  }, [])

  const registerMessage = useCallback<RegisterMessage>(
    (messageId, el, prevEl) => {
      if (prevEl && messageId) {
        messageElementsRef.current.delete(messageId)
        unobserveItemVisibility(prevEl)
      }
      if (el && messageId) {
        messageElementsRef.current.set(messageId, el)
        observeItemVisibility(el)
      }
    },
    [observeItemVisibility, unobserveItemVisibility]
  )

  const setRootElement = useCallback((el: HTMLDivElement | null) => {
    rootRef.current = el
  }, [])
  const setViewportElement = useCallback(
    (el: HTMLDivElement | null) => {
      if (viewportRef.current === el) return
      viewportRef.current = el
      syncScrollable()
    },
    [syncScrollable]
  )
  const setContentElement = useCallback((el: HTMLDivElement | null) => {
    contentRef.current = el
  }, [])
  const setSpacerElement = useCallback((el: HTMLDivElement | null) => {
    spacerRef.current = el
  }, [])

  useEffect(
    () => () => {
      if (autoscrollingTimeoutRef.current !== null) window.clearTimeout(autoscrollingTimeoutRef.current)
      intersectionObserverRef.current?.disconnect()
    },
    []
  )

  useLayoutEffect(() => {
    applyDefaultScrollPosition()
  }, [applyDefaultScrollPosition])

  useLayoutEffect(() => {
    if (autoScroll && followingBottomRef.current && prevItemsRef.current.length > 0) {
      scrollToEnd()
      return
    }
    syncScrollable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll])

  const context = useMemo<MessageScrollerContextValue>(
    () => ({
      scrollableStore,
      visibilityStore,
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
      setRootElement,
      setViewportElement,
      setContentElement,
      setSpacerElement,
      handleScroll,
      handleUserScrollIntent,
      handleResize,
      handleContentChange,
      preserveScrollOnPrependRef,
      observeItemVisibility,
      unobserveItemVisibility,
    }),
    [
      scrollableStore,
      visibilityStore,
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
      setRootElement,
      setViewportElement,
      setContentElement,
      setSpacerElement,
      handleScroll,
      handleUserScrollIntent,
      handleResize,
      handleContentChange,
      observeItemVisibility,
      unobserveItemVisibility,
    ]
  )

  return { context, registerMessage }
}

function MessageScrollerProvider({
  autoScroll = false,
  children,
  defaultScrollPosition = "end",
  scrollEdgeThreshold = DEFAULT_SCROLL_EDGE_THRESHOLD,
  scrollPreviousItemPeek = DEFAULT_SCROLL_PREVIOUS_ITEM_PEEK,
  scrollMargin = DEFAULT_SCROLL_MARGIN,
}: {
  children?: ReactNode
  autoScroll?: boolean
  defaultScrollPosition?: DefaultScrollPosition
  scrollEdgeThreshold?: number
  scrollPreviousItemPeek?: number
  scrollMargin?: number
}) {
  const { context, registerMessage } = useMessageScrollerState({
    autoScroll,
    defaultScrollPosition,
    scrollEdgeThreshold,
    scrollPreviousItemPeek,
    scrollMargin,
  })
  return (
    <MessageScrollerContext.Provider value={context}>
      <MessageRegistryContext.Provider value={registerMessage}>{children}</MessageRegistryContext.Provider>
    </MessageScrollerContext.Provider>
  )
}

function useMessageScroller() {
  const { scrollToEnd, scrollToMessage, scrollToStart } = useMessageScrollerContext()
  return useMemo(() => ({ scrollToEnd, scrollToMessage, scrollToStart }), [scrollToEnd, scrollToMessage, scrollToStart])
}

function useMessageScrollerScrollable(): Scrollable {
  const { scrollableStore } = useMessageScrollerContext()
  return useSyncExternalStore(scrollableStore.subscribe, scrollableStore.getSnapshot, scrollableStore.getSnapshot)
}

function useMessageScrollerVisibility(): VisibilityState {
  const { visibilityStore } = useMessageScrollerContext()
  return useSyncExternalStore(visibilityStore.subscribe, visibilityStore.getSnapshot, visibilityStore.getSnapshot)
}

function MessageScroller({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { setRootElement } = useMessageScrollerContext()
  return (
    <div
      ref={setRootElement}
      data-slot="message-scroller"
      className={cn(
        "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function MessageScrollerViewport({
  className,
  onKeyDown,
  onScroll,
  onTouchMove,
  onWheel,
  preserveScrollOnPrepend = true,
  ref,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  preserveScrollOnPrepend?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  const { handleResize, handleScroll, handleUserScrollIntent, preserveScrollOnPrependRef, setViewportElement } =
    useMessageScrollerContext()
  preserveScrollOnPrependRef.current = preserveScrollOnPrepend
  const localRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const combinedRef = useCallback(mergeRefs(localRef, setViewportElement, ref), [setViewportElement, ref])

  useEffect(() => {
    const el = localRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(handleResize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleResize])

  return (
    <div
      ref={combinedRef}
      data-slot="message-scroller-viewport"
      role="region"
      aria-label="Messages"
      tabIndex={0}
      onScroll={(event) => {
        handleScroll()
        onScroll?.(event)
      }}
      onWheel={(event) => {
        handleUserScrollIntent()
        onWheel?.(event)
      }}
      onTouchMove={(event) => {
        handleUserScrollIntent()
        onTouchMove?.(event)
      }}
      onKeyDown={(event) => {
        if (USER_SCROLL_KEYS.has(event.key)) handleUserScrollIntent()
        onKeyDown?.(event)
      }}
      className={cn(
        "size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-thumb-transparent data-autoscrolling:scrollbar-track-transparent",
        className
      )}
      {...props}
    />
  )
}

function MessageScrollerContent({
  className,
  ref,
  spacerClassName,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  spacerClassName?: string
  ref?: React.Ref<HTMLDivElement>
}) {
  const { handleContentChange, handleResize, setContentElement, setSpacerElement } = useMessageScrollerContext()
  const localRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const combinedRef = useCallback(mergeRefs(localRef, setContentElement, ref), [setContentElement, ref])

  useLayoutEffect(() => {
    const el = localRef.current
    if (!el || typeof MutationObserver === "undefined") {
      handleContentChange()
      return
    }
    handleContentChange()
    const observer = new MutationObserver(() => handleContentChange())
    observer.observe(el, { childList: true })
    return () => observer.disconnect()
  }, [handleContentChange])

  useEffect(() => {
    const el = localRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(handleResize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleResize])

  return (
    <div
      ref={combinedRef}
      data-slot="message-scroller-content"
      role="log"
      aria-relevant="additions"
      className={cn("flex h-max min-h-full flex-col gap-8", className)}
      {...props}
    >
      {props.children}
      <div ref={setSpacerElement} aria-hidden="true" data-message-scroller-spacer="" hidden className={spacerClassName} />
    </div>
  )
}

function MessageScrollerItem({
  className,
  messageId,
  ref,
  scrollAnchor = false,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  messageId?: string
  scrollAnchor?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  const registerMessage = useRegisterMessage()
  const localRef = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      const prev = localRef.current
      if (prev === el) return
      localRef.current = el
      if (messageId) registerMessage(messageId, el, prev)
    },
    [messageId, registerMessage]
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const combinedRef = useCallback(mergeRefs(setRef, ref), [setRef, ref])

  return (
    <div
      ref={combinedRef}
      data-slot="message-scroller-item"
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? "true" : "false"}
      className={cn(
        "min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
        className
      )}
      {...props}
    />
  )
}

function MessageScrollerButton({
  behavior = "smooth",
  children,
  className,
  direction = "end",
  onClick,
  render,
  variant = "secondary",
  size = "icon-sm",
  tabIndex,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> &
  Pick<ComponentPropsWithoutRef<typeof Button>, "variant" | "size"> & {
    behavior?: ScrollBehavior
    direction?: Direction
    render?: ReactElement<Record<string, unknown>>
  }) {
  const { scrollToEnd, scrollToStart } = useMessageScroller()
  const scrollable = useMessageScrollerScrollable()
  const active = direction === "start" ? scrollable.start : scrollable.end

  return useRender({
    render: render ?? <Button variant={variant} size={size} />,
    defaultTagName: "button",
    props: {
      type,
      "data-slot": "message-scroller-button",
      "data-direction": direction,
      "data-variant": variant,
      "data-size": size,
      "data-active": active ? "true" : "false",
      inert: !active,
      tabIndex: active ? tabIndex : -1,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!active) return
        event.currentTarget.blur()
        if (!event.defaultPrevented) {
          if (direction === "start") scrollToStart({ behavior })
          else scrollToEnd({ behavior })
        }
      },
      className: cn(
        "absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180",
        className
      ),
      children: children ?? (
        <>
          <ArrowDownIcon />
          <span className="sr-only">{direction === "end" ? "Scroll to end" : "Scroll to start"}</span>
        </>
      ),
      ...props,
    },
  })
}

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
}

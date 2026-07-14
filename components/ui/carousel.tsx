"use client"

/**
 * Carousel — a swipeable/draggable slide viewport (mouse, touch, or
 * pointer drag) that snaps to one slide at a time, with keyboard
 * (arrow keys) and button (Previous/Next) navigation. Slides are laid
 * out with plain flexbox; dragging/snapping animates a CSS `transform`
 * on the flex container rather than using native scroll.
 *
 * Feature scope: fully implemented and verified for the common case
 * this project's demo uses - horizontal, one slide per view, no loop.
 * `loop`, `align`, `dragFree`, and vertical orientation are wired up
 * and functional, but are a best-effort port of embla-carousel's
 * physics rather than a verified-identical reimplementation.
 * embla-carousel's plugin system (autoplay, autoscroll, etc.) and its
 * more advanced options (`containScroll`, `slidesToScroll`,
 * `dragThreshold`, `skipSnaps`, RTL `direction`) are not implemented -
 * no demo in this project uses them. The `plugins` prop is accepted
 * for API compatibility but has no effect.
 *
 * Usage:
 *   <Carousel>
 *     <CarouselContent>
 *       <CarouselItem>Slide 1</CarouselItem>
 *       <CarouselItem>Slide 2</CarouselItem>
 *     </CarouselContent>
 *     <CarouselPrevious />
 *     <CarouselNext />
 *   </Carousel>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/components/ui/button.tsx (CarouselPrevious/CarouselNext)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

type CarouselOptions = {
  loop?: boolean
  align?: "start" | "center" | "end"
  axis?: "x" | "y"
  dragFree?: boolean
  startIndex?: number
  duration?: number
}
/** Accepted for API compatibility with embla-carousel's plugin system -
 * not implemented, has no effect. */
type CarouselPlugin = unknown[]

type CarouselApi = {
  scrollPrev: (jump?: boolean) => void
  scrollNext: (jump?: boolean) => void
  scrollTo: (index: number, jump?: boolean) => void
  canScrollPrev: () => boolean
  canScrollNext: () => boolean
  selectedScrollSnap: () => number
  previousScrollSnap: () => number
  scrollSnapList: () => number[]
  slideNodes: () => HTMLElement[]
  reInit: () => void
  on: (event: "select" | "reInit", callback: () => void) => void
  off: (event: "select" | "reInit", callback: () => void) => void
}

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextValue = {
  viewportRef: (el: HTMLDivElement | null) => void
  containerRef: (el: HTMLDivElement | null) => void
  orientation: "horizontal" | "vertical"
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  dragging: boolean
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

function useCarousel() {
  const context = useContext(CarouselContext)
  if (!context) throw new Error("useCarousel must be used within a <Carousel />")
  return context
}

const DEFAULT_DURATION = 300
const FLING_VELOCITY_THRESHOLD = 0.4 // px/ms
const COMMIT_DISTANCE_RATIO = 0.2

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useCarouselEngine({
  opts,
  orientation,
  setApi,
}: {
  opts?: CarouselOptions
  orientation: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}) {
  const axis = opts?.axis ?? (orientation === "vertical" ? "y" : "x")
  const align = opts?.align ?? "start"
  const loop = opts?.loop ?? false
  const dragFree = opts?.dragFree ?? false
  const duration = opts?.duration ?? DEFAULT_DURATION

  const viewportElRef = useRef<HTMLDivElement | null>(null)
  const containerElRef = useRef<HTMLDivElement | null>(null)
  const snapPointsRef = useRef<number[]>([])
  const [translate, setTranslate] = useState(0)
  const translateRef = useRef(0)
  const [selectedIndex, setSelectedIndex] = useState(opts?.startIndex ?? 0)
  const [dragging, setDragging] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const listenersRef = useRef<Record<"select" | "reInit", Set<() => void>>>({
    select: new Set(),
    reInit: new Set(),
  })

  const setTranslateBoth = useCallback((value: number) => {
    translateRef.current = value
    setTranslate(value)
  }, [])

  const measure = useCallback(() => {
    const viewport = viewportElRef.current
    const container = containerElRef.current
    if (!viewport || !container) return
    const viewportSize = axis === "x" ? viewport.clientWidth : viewport.clientHeight
    const slides = Array.from(container.children) as HTMLElement[]
    snapPointsRef.current = slides.map((slide) => {
      const slideStart = axis === "x" ? slide.offsetLeft : slide.offsetTop
      const slideSize = axis === "x" ? slide.offsetWidth : slide.offsetHeight
      if (align === "center") return slideStart - (viewportSize - slideSize) / 2
      if (align === "end") return slideStart - (viewportSize - slideSize)
      return slideStart
    })
  }, [axis, align])

  const emit = useCallback((event: "select" | "reInit") => {
    listenersRef.current[event].forEach((cb) => cb())
  }, [])

  const animateTo = useCallback(
    (target: number, jump = false) => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      const start = translateRef.current
      const delta = target - start
      if (jump || duration <= 0 || Math.abs(delta) < 0.5) {
        setTranslateBoth(target)
        return
      }
      const startTime = performance.now()
      function step(now: number) {
        const elapsed = now - startTime
        const t = Math.min(1, elapsed / duration)
        setTranslateBoth(start + delta * easeOutCubic(t))
        if (t < 1) animationFrameRef.current = requestAnimationFrame(step)
        else animationFrameRef.current = null
      }
      animationFrameRef.current = requestAnimationFrame(step)
    },
    [duration, setTranslateBoth]
  )

  const clampIndex = useCallback(
    (index: number) => {
      const count = snapPointsRef.current.length
      if (count === 0) return 0
      if (loop) return ((index % count) + count) % count
      return Math.min(Math.max(index, 0), count - 1)
    },
    [loop]
  )

  const scrollTo = useCallback(
    (index: number, jump = false) => {
      const clamped = clampIndex(index)
      const target = snapPointsRef.current[clamped] ?? 0
      animateTo(-target, jump)
      setSelectedIndex(clamped)
      emit("select")
    },
    [clampIndex, animateTo, emit]
  )

  const scrollPrev = useCallback(
    (jump = false) => scrollTo(selectedIndex - 1, jump),
    [scrollTo, selectedIndex]
  )
  const scrollNext = useCallback(
    (jump = false) => scrollTo(selectedIndex + 1, jump),
    [scrollTo, selectedIndex]
  )

  const canScrollPrev = loop ? snapPointsRef.current.length > 1 : selectedIndex > 0
  const canScrollNext = loop
    ? snapPointsRef.current.length > 1
    : selectedIndex < snapPointsRef.current.length - 1

  // Re-measure on mount, on child-count change, and on resize.
  useLayoutEffect(() => {
    measure()
    animateTo(-(snapPointsRef.current[clampIndex(selectedIndex)] ?? 0), true)
    emit("reInit")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure])

  useEffect(() => {
    const container = containerElRef.current
    if (!container || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      measure()
      animateTo(-(snapPointsRef.current[clampIndex(selectedIndex)] ?? 0), true)
      emit("reInit")
    })
    observer.observe(container)
    for (const child of Array.from(container.children)) observer.observe(child)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure])

  useEffect(() => {
    if (setApi) setApi(api)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setApi])

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    },
    []
  )

  const dragRef = useRef<{
    pointerId: number
    startClient: number
    startTranslate: number
    lastClient: number
    lastTime: number
    velocity: number
  } | null>(null)

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      const client = axis === "x" ? event.clientX : event.clientY
      dragRef.current = {
        pointerId: event.pointerId,
        startClient: client,
        startTranslate: translateRef.current,
        lastClient: client,
        lastTime: event.timeStamp,
        velocity: 0,
      }
      setDragging(true)
      ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    },
    [axis]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const client = axis === "x" ? event.clientX : event.clientY
      const dt = event.timeStamp - drag.lastTime
      if (dt > 0) drag.velocity = (client - drag.lastClient) / dt
      drag.lastClient = client
      drag.lastTime = event.timeStamp
      let next = drag.startTranslate + (client - drag.startClient)
      if (!loop) {
        const min = -(snapPointsRef.current[snapPointsRef.current.length - 1] ?? 0)
        const max = 0
        if (next > max) next = max + (next - max) * 0.35
        if (next < min) next = min + (next - min) * 0.35
      }
      setTranslateBoth(next)
    },
    [axis, loop, setTranslateBoth]
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      setDragging(false)

      if (dragFree) {
        const target = -translateRef.current
        let nearest = 0
        let nearestDist = Infinity
        snapPointsRef.current.forEach((p, i) => {
          const d = Math.abs(p - target)
          if (d < nearestDist) {
            nearestDist = d
            nearest = i
          }
        })
        scrollTo(nearest)
        return
      }

      const draggedDistance = translateRef.current - drag.startTranslate
      const currentSnap = snapPointsRef.current[selectedIndex] ?? 0
      const slideSize =
        snapPointsRef.current.length > 1
          ? Math.abs((snapPointsRef.current[1] ?? 0) - (snapPointsRef.current[0] ?? 0))
          : 1
      const fling = Math.abs(drag.velocity) > FLING_VELOCITY_THRESHOLD
      const pastThreshold = Math.abs(draggedDistance) > slideSize * COMMIT_DISTANCE_RATIO

      if (fling || pastThreshold) {
        const direction = draggedDistance < 0 ? 1 : -1
        scrollTo(selectedIndex + direction)
      } else {
        animateTo(-currentSnap)
      }
    },
    [dragFree, scrollTo, selectedIndex, animateTo]
  )

  const setViewportEl = useCallback((el: HTMLDivElement | null) => {
    viewportElRef.current = el
  }, [])
  const setContainerEl = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el
  }, [])

  // Argument-stripped wrappers safe to pass directly to onClick (which would
  // otherwise pass the MouseEvent through as the `jump` parameter).
  const scrollPrevClick = useCallback(() => scrollPrev(), [scrollPrev])
  const scrollNextClick = useCallback(() => scrollNext(), [scrollNext])

  const api = useMemo<CarouselApi>(
    () => ({
      scrollPrev,
      scrollNext,
      scrollTo,
      canScrollPrev: () => canScrollPrev,
      canScrollNext: () => canScrollNext,
      selectedScrollSnap: () => selectedIndex,
      previousScrollSnap: () => selectedIndex,
      scrollSnapList: () => snapPointsRef.current,
      slideNodes: () => Array.from(containerElRef.current?.children ?? []) as HTMLElement[],
      reInit: () => {
        measure()
        emit("reInit")
      },
      on: (event, cb) => listenersRef.current[event].add(cb),
      off: (event, cb) => listenersRef.current[event].delete(cb),
    }),
    [scrollPrev, scrollNext, scrollTo, canScrollPrev, canScrollNext, selectedIndex, measure, emit]
  )

  return {
    setViewportEl,
    setContainerEl,
    translate,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    scrollPrev: scrollPrevClick,
    scrollNext: scrollNextClick,
    canScrollPrev,
    canScrollNext,
    api,
    axis,
  }
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins: _plugins,
  className,
  children,
  onKeyDownCapture,
  ...props
}: ComponentProps<"div"> & CarouselProps) {
  const engine = useCarouselEngine({ opts, orientation, setApi })

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDownCapture?.(event)
    if (event.defaultPrevented) return
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      engine.scrollPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      engine.scrollNext()
    }
  }

  const context = useMemo<CarouselContextValue>(
    () => ({
      viewportRef: engine.setViewportEl,
      containerRef: engine.setContainerEl,
      orientation,
      scrollPrev: engine.scrollPrev,
      scrollNext: engine.scrollNext,
      canScrollPrev: engine.canScrollPrev,
      canScrollNext: engine.canScrollNext,
      onPointerDown: engine.onPointerDown,
      dragging: engine.dragging,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine.setViewportEl, engine.setContainerEl, orientation, engine.scrollPrev, engine.scrollNext, engine.canScrollPrev, engine.canScrollNext, engine.onPointerDown, engine.dragging]
  )

  return (
    <CarouselContext.Provider value={context}>
      <CarouselTransformContext.Provider
        value={{ translate: engine.translate, axis: engine.axis, onPointerMove: engine.onPointerMove, onPointerUp: engine.onPointerUp }}
      >
        <div
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          data-slot="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselTransformContext.Provider>
    </CarouselContext.Provider>
  )
}

const CarouselTransformContext = createContext<{
  translate: number
  axis: "x" | "y"
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
} | null>(null)

function CarouselContent({ className, ...props }: ComponentProps<"div">) {
  const { viewportRef, containerRef, orientation, onPointerDown, dragging } = useCarousel()
  const transform = useContext(CarouselTransformContext)
  if (!transform) throw new Error("CarouselContent must be used within a <Carousel />")

  return (
    <div ref={viewportRef} className="overflow-hidden" data-slot="carousel-content">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={transform.onPointerMove}
        onPointerUp={transform.onPointerUp}
        onPointerCancel={transform.onPointerUp}
        data-dragging={dragging ? "" : undefined}
        style={{
          transform:
            transform.axis === "x"
              ? `translate3d(${transform.translate}px, 0, 0)`
              : `translate3d(0, ${transform.translate}px, 0)`,
          transition: dragging ? "none" : undefined,
          touchAction: transform.axis === "x" ? "pan-y" : "pan-x",
        }}
        className={cn(
          "flex transition-transform duration-300 ease-out",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "inset-y-0 -left-12 my-auto"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "inset-y-0 -right-12 my-auto"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
}

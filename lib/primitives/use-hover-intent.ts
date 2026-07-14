/**
 * useHoverIntent — hover-open/hover-close timing for a trigger + floating
 * content pair, with "safe polygon" tolerance: moving the cursor
 * diagonally from the trigger toward the content (e.g. into an open
 * submenu) won't prematurely close it, even though the cursor briefly
 * leaves both elements while crossing the gap between them. This is the
 * thing naive hover-menu implementations almost always get wrong.
 *
 * Usage:
 *   const { triggerHandlers, contentHandlers } = useHoverIntent({
 *     contentRef,
 *     onOpen: () => setOpen(true),
 *     onClose: () => setOpen(false),
 *     openDelay: 100,
 *     closeDelay: 0,
 *   })
 *   <div {...triggerHandlers}>...</div>
 *   <div ref={contentRef} {...contentHandlers}>...</div>
 *
 * Depends on: nothing else in this project.
 */
import { useRef } from "react"

export function useHoverIntent({
  contentRef,
  onOpen,
  onClose,
  openDelay = 100,
  closeDelay = 0,
}: {
  contentRef: React.RefObject<HTMLElement | null>
  onOpen: () => void
  onClose: () => void
  openDelay?: number
  closeDelay?: number
}) {
  const openTimerRef = useRef<number | undefined>(undefined)
  const closeTimerRef = useRef<number | undefined>(undefined)
  const trackingMoveRef = useRef<((event: MouseEvent) => void) | null>(null)

  function clearTracking() {
    if (trackingMoveRef.current) {
      window.removeEventListener("mousemove", trackingMoveRef.current)
      trackingMoveRef.current = null
    }
  }

  function scheduleClose() {
    clearTracking()
    window.clearTimeout(closeTimerRef.current)
    if (closeDelay === 0) {
      onClose()
    } else {
      closeTimerRef.current = window.setTimeout(onClose, closeDelay)
    }
  }

  function cancelClose() {
    window.clearTimeout(closeTimerRef.current)
  }

  function onTriggerMouseEnter() {
    clearTracking()
    cancelClose()
    window.clearTimeout(openTimerRef.current)
    if (openDelay === 0) {
      onOpen()
    } else {
      openTimerRef.current = window.setTimeout(onOpen, openDelay)
    }
  }

  function onTriggerMouseLeave(event: React.MouseEvent) {
    window.clearTimeout(openTimerRef.current)

    const content = contentRef.current
    if (!content) {
      scheduleClose()
      return
    }

    // Build a triangle from the cursor's last position (leaving the
    // trigger) to the two corners of the content's edge nearest the
    // trigger, and keep the menu open as long as the cursor stays inside
    // that triangle while moving toward the content.
    const start = { x: event.clientX, y: event.clientY }
    const rect = content.getBoundingClientRect()
    const nearX = start.x < rect.left ? rect.left : start.x > rect.right ? rect.right : start.x
    const corners: [{ x: number; y: number }, { x: number; y: number }] =
      nearX <= rect.left
        ? [{ x: rect.left, y: rect.top }, { x: rect.left, y: rect.bottom }]
        : [{ x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }]

    cancelClose()
    clearTracking()

    const onMove = (moveEvent: MouseEvent) => {
      const point = { x: moveEvent.clientX, y: moveEvent.clientY }
      if (isInsideTriangle(point, start, corners[0], corners[1]) || content.contains(moveEvent.target as Node)) {
        return
      }
      clearTracking()
      scheduleClose()
    }
    trackingMoveRef.current = onMove
    window.addEventListener("mousemove", onMove)
  }

  function onContentMouseEnter() {
    clearTracking()
    cancelClose()
  }

  function onContentMouseLeave() {
    scheduleClose()
  }

  return {
    triggerHandlers: {
      onMouseEnter: onTriggerMouseEnter,
      onMouseLeave: onTriggerMouseLeave,
    },
    contentHandlers: {
      onMouseEnter: onContentMouseEnter,
      onMouseLeave: onContentMouseLeave,
    },
  }
}

function sign(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
}

function isInsideTriangle(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
) {
  const d1 = sign(point, a, b)
  const d2 = sign(point, b, c)
  const d3 = sign(point, c, a)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

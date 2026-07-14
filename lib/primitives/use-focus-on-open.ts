/**
 * useFocusOnOpen — moves real DOM focus to a target inside a floating
 * popup once it opens. Popups built on usePresence + useFloatingPosition
 * go through a brief "starting" transition phase right after mounting
 * (their entrance CSS transition, including a discrete `visibility`
 * flip, hasn't resolved yet), during which they're not actually
 * focusable — a `.focus()` call made the instant `mounted` flips true
 * silently fails. This retries on the next few animation frames until
 * focus actually lands, then stops until the popup closes and reopens.
 *
 * Usage:
 *   useFocusOnOpen({ mounted, containerRef })
 *   useFocusOnOpen({ mounted, containerRef, targetRef: selectedItemRef })
 *
 * Depends on: nothing else in this project.
 */
import { useEffect, useRef, type RefObject } from "react"

const MAX_ATTEMPTS = 10

export function useFocusOnOpen({
  mounted,
  containerRef,
  targetRef,
  selector = "[data-roving-item]",
}: {
  mounted: boolean
  containerRef: RefObject<HTMLElement | null>
  targetRef?: RefObject<HTMLElement | null>
  selector?: string
}) {
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!mounted) {
      focusedRef.current = false
      return
    }
    if (focusedRef.current) return

    let rafId: number
    let attempts = 0
    const tryFocus = () => {
      const el = targetRef?.current ?? containerRef.current?.querySelector<HTMLElement>(selector)
      el?.focus()
      if (el && document.activeElement === el) {
        focusedRef.current = true
        return
      }
      attempts += 1
      if (attempts < MAX_ATTEMPTS) rafId = requestAnimationFrame(tryFocus)
    }
    rafId = requestAnimationFrame(tryFocus)
    return () => cancelAnimationFrame(rafId)
  }, [mounted, containerRef, targetRef, selector])
}

"use client"

/**
 * TopLoader — a thin progress bar pinned to the top of the viewport that
 * animates while a page is loading (an `nprogress`/`react-top-loader`-style
 * indicator, no dependency on either). Mount it once near the app root;
 * `<TopLoader />` auto-starts and auto-completes on every React Router
 * navigation (via `useLocation`), and the imperative `topLoader` API
 * (`start`/`set`/`inc`/`done` — imported from `src/lib/top-loader.ts`) can
 * also be called from anywhere - e.g. wrap a real data fetch so the bar
 * tracks actual load time instead of just the route swap. The store lives
 * in its own file so this one only exports a React component and stays
 * hot-reloadable under Vite's Fast Refresh.
 *
 * Usage:
 *   // once, near the app root (must be inside a react-router-dom <Router>):
 *   <TopLoader />
 *
 *   // anywhere, to track something other than route navigation:
 *   import { topLoader } from "@/lib/top-loader"
 *   topLoader.start()
 *   await doSlowThing()
 *   topLoader.done()
 *
 * Depends on:
 *   - src/lib/top-loader.ts (the store + imperative topLoader API)
 *   - src/lib/utils.ts (cn helper)
 *   - react-router-dom's useLocation (this project's router)
 */
import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { topLoader, topLoaderStore } from "@/lib/top-loader"
import { cn } from "@/lib/utils"

type TopLoaderProps = {
  /** CSS color for the bar/spinner - defaults to the theme's `--color-primary`. */
  color?: string
  /** Bar thickness in px. */
  height?: number
  /** Show a small spinning indicator in the top-right corner while loading. */
  showSpinner?: boolean
  /** How often (ms) the bar trickles forward while "loading". */
  crawlSpeed?: number
  /** Transition duration (ms) for width/opacity changes. */
  speed?: number
  /** Glow under the bar. `true` for the default glow, a CSS box-shadow string for a custom one, `false` to disable. */
  shadow?: boolean | string
  /** Starting progress (0-1) when a load starts. */
  initialPosition?: number
  zIndex?: number
  /** Auto `start()`/`done()` on every React Router navigation. Turn off to
   * drive the bar entirely via the `topLoader` API yourself (e.g. so it
   * tracks a data fetch instead of the route swap). */
  autoStartOnNavigation?: boolean
  className?: string
}

function TopLoader({
  color,
  height = 3,
  showSpinner = true,
  crawlSpeed = 200,
  speed = 200,
  shadow = true,
  initialPosition = 0.08,
  zIndex = 1600,
  autoStartOnNavigation = true,
  className,
}: TopLoaderProps = {}) {
  const [state, setState] = useState(topLoaderStore.state)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => topLoaderStore.subscribe(setState), [])

  useEffect(() => {
    if (state.status !== "loading") return
    const id = window.setInterval(() => topLoader.inc(), crawlSpeed)
    return () => window.clearInterval(id)
  }, [state.status, crawlSpeed])

  useEffect(() => {
    if (state.status !== "done") return
    const id = window.setTimeout(() => topLoaderStore.reset(), speed + 200)
    return () => window.clearTimeout(id)
  }, [state.status, speed])

  const locationKey = `${pathname}?${searchParams.toString()}`
  const prevLocationKeyRef = useRef(locationKey)
  useEffect(() => {
    if (!autoStartOnNavigation || prevLocationKeyRef.current === locationKey) return
    prevLocationKeyRef.current = locationKey
    topLoader.start(initialPosition)
    // Let the "loading" state paint at least one frame before completing,
    // so fast (synchronous) navigations still show a visible blip instead
    // of jumping straight from 0 to gone.
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => topLoader.done())
    })
    return () => window.cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey])

  const visible = state.status !== "initial"
  const glowColor = color ?? "var(--color-primary)"
  const boxShadow =
    shadow === false ? undefined : typeof shadow === "string" ? shadow : `0 0 10px ${glowColor}, 0 0 5px ${glowColor}`

  return (
    <div
      aria-hidden
      data-slot="top-loader"
      data-status={state.status}
      style={{ zIndex }}
      className={cn("pointer-events-none fixed inset-x-0 top-0", className)}
    >
      <div
        data-slot="top-loader-bar"
        className={cn(!color && "bg-primary")}
        style={{
          width: `${state.progress}%`,
          height,
          backgroundColor: color,
          opacity: visible ? 1 : 0,
          boxShadow,
          transition: `width ${speed}ms ease, opacity ${speed}ms ease`,
        }}
      />
      {showSpinner && (
        <Loader2Icon
          data-slot="top-loader-spinner"
          className={cn("fixed top-3 right-3 size-4 animate-spin", !color && "text-primary")}
          style={{ color, opacity: visible ? 1 : 0, transition: `opacity ${speed}ms ease` }}
        />
      )}
    </div>
  )
}

export { TopLoader }
export type { TopLoaderProps }

"use client"

/**
 * TopLoader — a thin progress bar pinned to the top of the viewport that
 * animates while a page is loading (an `nprogress`-style indicator, no
 * dependency on it). Mount it once near the app root: `<TopLoader />`.
 *
 * Built for the Next.js App Router, where `usePathname()`/`useSearchParams()`
 * only change *after* a navigation has already finished — there is no
 * router-level "navigation started" event to hook into. So this component:
 *   1. Listens for clicks on same-origin, non-modified <a> (and Next <Link>)
 *      clicks in the capture phase and calls `topLoader.start()` immediately,
 *      before the browser/router has done anything.
 *   2. Listens for `popstate` (back/forward) and does the same.
 *   3. Calls `topLoader.done()` once `usePathname()`/`useSearchParams()`
 *      actually change, which is the real "navigation finished" signal.
 *      (This piece needs its own component wrapped in <Suspense> - Next
 *      requires any `useSearchParams()` caller to have a Suspense boundary
 *      above it, or static generation of routes like /_not-found breaks.)
 *   4. Force-completes after a timeout as a safety net (aborted navigations,
 *      same-URL link clicks, etc. would otherwise leave the bar stuck).
 *
 * The imperative `topLoader` API (`start`/`set`/`inc`/`done`, from
 * `@/lib/top-loader`) can also be called directly - e.g. wrap a real data
 * fetch, or a programmatic `router.push()`, so the bar tracks that instead
 * of only reacting to link clicks.
 *
 * Usage:
 *   // once, near the app root:
 *   <TopLoader />
 *
 *   // anywhere, to track something other than a link-click navigation:
 *   import { topLoader } from "@/lib/top-loader"
 *   topLoader.start()
 *   await doSlowThing()
 *   topLoader.done()
 *
 * Depends on:
 *   - @/lib/top-loader.ts (the store + imperative topLoader API)
 *   - @/lib/utils.ts (cn helper)
 *   - next/navigation's usePathname/useSearchParams (this project's router)
 */
import { Suspense, useEffect, useRef, useState } from "react"
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
  /** Start the bar on link clicks/back-forward navigation and complete it
   * when the route actually changes. Turn off to drive the bar entirely via
   * the `topLoader` API yourself. */
  autoStartOnNavigation?: boolean
  /** Force-complete a stuck "loading" bar after this many ms (aborted nav,
   * clicking the current page's own link, etc). */
  maxLoadingMs?: number
  className?: string
}

/** True for a same-tab, same-origin, unmodified left-click on an in-app link. */
function isInterceptableLinkClick(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented) return null
  if (event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null

  const anchor = (event.target as Element | null)?.closest?.("a")
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return null
  if (!anchor.href) return null
  if (anchor.target && anchor.target !== "_self") return null
  if (anchor.hasAttribute("download")) return null

  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return null
  }
  if (url.origin !== window.location.origin) return null

  const samePath = url.pathname === window.location.pathname && url.search === window.location.search
  const onlyHashDiffers = samePath && url.hash !== window.location.hash
  if (samePath && (onlyHashDiffers || !url.hash)) return null

  return anchor
}

/**
 * Isolated because `useSearchParams()` requires a `<Suspense>` boundary
 * above it in the App Router - keeping it out of the main component means
 * the bar/spinner UI itself doesn't need one.
 */
function RouteChangeCompletion() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locationKey = `${pathname}?${searchParams.toString()}`
  const prevLocationKeyRef = useRef(locationKey)

  useEffect(() => {
    if (prevLocationKeyRef.current === locationKey) return
    prevLocationKeyRef.current = locationKey
    topLoader.done(true)
  }, [locationKey])

  return null
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
  maxLoadingMs = 8000,
  className,
}: TopLoaderProps = {}) {
  const [state, setState] = useState(topLoaderStore.state)

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

  // Safety net: if nothing completes the bar (blocked navigation, clicking a
  // link back to the current URL, a thrown error mid-navigation), don't
  // leave it stuck at some partial width forever.
  useEffect(() => {
    if (state.status !== "loading") return
    const id = window.setTimeout(() => topLoader.done(true), maxLoadingMs)
    return () => window.clearTimeout(id)
  }, [state.status, maxLoadingMs])

  // Real "navigation started" signal: intercept the click/popstate that
  // triggers it, since the router itself won't tell us.
  useEffect(() => {
    if (!autoStartOnNavigation) return

    function onClick(event: MouseEvent) {
      if (isInterceptableLinkClick(event)) topLoader.start(initialPosition)
    }
    function onPopState() {
      topLoader.start(initialPosition)
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPopState)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState)
    }
  }, [autoStartOnNavigation, initialPosition])

  const visible = state.status !== "initial"
  const glowColor = color ?? "var(--color-primary)"
  const boxShadow =
    shadow === false ? undefined : typeof shadow === "string" ? shadow : `0 0 10px ${glowColor}, 0 0 5px ${glowColor}`

  return (
    <>
      {autoStartOnNavigation && (
        <Suspense fallback={null}>
          <RouteChangeCompletion />
        </Suspense>
      )}
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
    </>
  )
}

export { TopLoader }
export type { TopLoaderProps }

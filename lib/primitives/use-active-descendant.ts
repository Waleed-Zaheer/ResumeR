/**
 * useActiveDescendant — arrow-key navigation for lists where real DOM
 * focus stays on one control (an input) and a `data-highlighted`-style
 * attribute marks the "virtually" active item instead — the combobox/
 * listbox pattern. Contrast with use-roving-focus.ts, where real focus
 * moves between items (menus, radio groups, tabs).
 *
 * Usage:
 *   const { containerRef, onKeyDown } = useActiveDescendant({
 *     activeValue,
 *     setActiveValue,
 *     onSelect: (value) => selectItem(value),
 *   })
 *   <input onKeyDown={onKeyDown} />
 *   <ul ref={containerRef}>
 *     <li data-active-item data-value="a" data-highlighted={activeValue === "a" ? "" : undefined}>
 *   </ul>
 *
 * Depends on: nothing else in this project.
 */
import { useRef, type KeyboardEvent, type RefObject } from "react"

export function useActiveDescendant<T extends HTMLElement>({
  activeValue,
  setActiveValue,
  onSelect,
  loop = true,
  containerRef: externalContainerRef,
}: {
  activeValue: string | null
  setActiveValue: (value: string | null) => void
  onSelect?: (value: string) => void
  loop?: boolean
  /** Pass this when the item list lives in a different component than the
   * one calling this hook (e.g. a combobox input driving a sibling list) -
   * share the same ref object so getItems() actually finds the list. */
  containerRef?: RefObject<T | null>
}) {
  const ownContainerRef = useRef<T>(null)
  const containerRef = externalContainerRef ?? ownContainerRef

  function getItems(): HTMLElement[] {
    const container = containerRef.current
    if (!container) return []
    return Array.from(
      container.querySelectorAll<HTMLElement>("[data-active-item]")
    ).filter(
      (el) =>
        el.getAttribute("data-disabled") !== "true" &&
        el.getAttribute("data-hidden") !== "true"
    )
  }

  function onKeyDown(event: KeyboardEvent) {
    const items = getItems()
    if (items.length === 0) return

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const currentIndex = items.findIndex(
        (el) => el.getAttribute("data-value") === activeValue
      )
      const raw = currentIndex + (event.key === "ArrowDown" ? 1 : -1)
      const nextIndex = loop
        ? (raw + items.length) % items.length
        : Math.min(Math.max(raw, 0), items.length - 1)
      const nextItem = items[nextIndex]
      const nextValue = nextItem?.getAttribute("data-value")
      if (nextValue !== null && nextValue !== undefined) {
        setActiveValue(nextValue)
        nextItem.scrollIntoView({ block: "nearest" })
      }
    } else if (event.key === "Enter") {
      if (activeValue !== null) {
        event.preventDefault()
        onSelect?.(activeValue)
      }
    } else if (event.key === "Home") {
      event.preventDefault()
      const value = items[0]?.getAttribute("data-value")
      if (value) {
        setActiveValue(value)
        items[0]?.scrollIntoView({ block: "nearest" })
      }
    } else if (event.key === "End") {
      event.preventDefault()
      const last = items[items.length - 1]
      const value = last?.getAttribute("data-value")
      if (value) {
        setActiveValue(value)
        last?.scrollIntoView({ block: "nearest" })
      }
    }
  }

  return { containerRef, onKeyDown }
}

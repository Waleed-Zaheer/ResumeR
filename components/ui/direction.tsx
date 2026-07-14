"use client"

/**
 * DirectionProvider / useDirection — provides left-to-right or
 * right-to-left reading direction to descendant components. Menus,
 * tooltips, and anything else in this library that needs to flip its
 * layout for RTL reads this.
 *
 * Usage:
 *   <DirectionProvider direction="rtl">
 *     <App />
 *   </DirectionProvider>
 *
 *   function SomeComponent() {
 *     const direction = useDirection() // "ltr" | "rtl"
 *   }
 *
 * Depends on: nothing else in this project.
 */
import { createContext, useContext, type ReactNode } from "react"

type TextDirection = "ltr" | "rtl"

const DirectionContext = createContext<TextDirection>("ltr")

function DirectionProvider({
  direction = "ltr",
  children,
}: {
  direction?: TextDirection
  children?: ReactNode
}) {
  return (
    <DirectionContext.Provider value={direction}>
      {children}
    </DirectionContext.Provider>
  )
}

function useDirection(): TextDirection {
  return useContext(DirectionContext)
}

export { DirectionProvider, useDirection }
export type { TextDirection }

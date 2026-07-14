"use client"

/**
 * Collapsible — a trigger that shows/hides a panel of content, staying
 * mounted through its close animation if you add one via CSS (the panel
 * exposes the same data-open/data-closed/data-starting-style/
 * data-ending-style/--collapsible-panel-height contract Base UI used to).
 *
 * Usage:
 *   <Collapsible defaultOpen>
 *     <CollapsibleTrigger>Toggle</CollapsibleTrigger>
 *     <CollapsibleContent>Hidden content</CollapsibleContent>
 *   </Collapsible>
 *
 * Depends on:
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-presence.ts (mount-through-exit-animation + height var)
 */
import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
} from "react"

import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { usePresence } from "@/lib/primitives/use-presence"

const CollapsibleContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  disabled?: boolean
  contentId: string
}>({ open: false, setOpen: () => {}, contentId: "" })

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })
  const contentId = useId()

  return (
    <CollapsibleContext.Provider value={{ open, setOpen, disabled, contentId }}>
      <div
        data-slot="collapsible"
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({
  disabled: triggerDisabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button"> & { disabled?: boolean }) {
  const { open, setOpen, disabled, contentId } = useContext(CollapsibleContext)
  const isDisabled = disabled || triggerDisabled

  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded={open}
      aria-controls={contentId}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) setOpen(!open)
      }}
      {...props}
    />
  )
}

function CollapsibleContent({
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { open, contentId } = useContext(CollapsibleContext)
  const { mounted, ref, ...presenceAttrs } = usePresence(open, {
    heightVar: "--collapsible-panel-height",
    widthVar: "--collapsible-panel-width",
  })

  if (!mounted) return null

  return (
    <div
      id={contentId}
      ref={ref as React.Ref<HTMLDivElement>}
      data-slot="collapsible-content"
      {...presenceAttrs}
      {...props}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

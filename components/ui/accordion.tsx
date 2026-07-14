"use client"

/**
 * Accordion — a vertically stacked set of headings that each reveal a
 * panel of content. By default only one item is open at a time; pass
 * `multiple` to allow several open together.
 *
 * Usage:
 *   <Accordion defaultValue={["item-1"]}>
 *     <AccordionItem value="item-1">
 *       <AccordionTrigger>Question?</AccordionTrigger>
 *       <AccordionContent>Answer.</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/lib/primitives/use-presence.ts (exit animation + measured panel height)
 */
import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
} from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/lib/primitives/use-controllable-state"
import { usePresence } from "@/lib/primitives/use-presence"

const AccordionContext = createContext<{
  value: string[]
  setValue: (value: string[]) => void
  multiple: boolean
  disabled?: boolean
}>({ value: [], setValue: () => {}, multiple: false })

type AccordionItemContextValue = {
  itemValue: string
  open: boolean
  disabled?: boolean
  triggerId: string
  contentId: string
}
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

function Accordion({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
  value?: readonly string[]
  defaultValue?: readonly string[]
  onValueChange?: (value: string[]) => void
  multiple?: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useControllableState<string[]>({
    prop: valueProp ? [...valueProp] : undefined,
    defaultProp: defaultValue ? [...defaultValue] : [],
    onChange: onValueChange,
  })

  return (
    <AccordionContext.Provider value={{ value, setValue, multiple, disabled }}>
      <div
        data-slot="accordion"
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-2xl border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  className,
  value: itemValue,
  disabled: itemDisabled,
  ...props
}: ComponentPropsWithoutRef<"div"> & { value: string; disabled?: boolean }) {
  const { value } = useContext(AccordionContext)
  const open = value.includes(itemValue)
  const triggerId = useId()
  const contentId = useId()

  return (
    <AccordionItemContext.Provider
      value={{ itemValue, open, disabled: itemDisabled, triggerId, contentId }}
    >
      <div
        data-slot="accordion-item"
        data-open={open ? "" : undefined}
        className={cn("not-last:border-b data-open:bg-muted/50", className)}
        {...props}
      />
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { value, setValue, multiple, disabled: groupDisabled } =
    useContext(AccordionContext)
  const item = useContext(AccordionItemContext)
  if (!item) throw new Error("AccordionTrigger must be used within an AccordionItem")
  const isDisabled = groupDisabled || item.disabled

  function toggle() {
    if (isDisabled) return
    if (item!.open) {
      setValue(value.filter((v) => v !== item!.itemValue))
    } else {
      setValue(multiple ? [...value, item!.itemValue] : [item!.itemValue])
    }
  }

  return (
    <h3 className="flex">
      <button
        type="button"
        id={item.triggerId}
        aria-expanded={item.open}
        aria-controls={item.contentId}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        data-slot="accordion-trigger"
        data-panel-open={item.open ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) toggle()
        }}
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between gap-6 border border-transparent p-4 text-left text-sm font-medium transition-all outline-none hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </button>
    </h3>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const item = useContext(AccordionItemContext)
  if (!item) throw new Error("AccordionContent must be used within an AccordionItem")
  const { mounted, ref, ...presenceAttrs } = usePresence(item.open, {
    heightVar: "--accordion-panel-height",
    widthVar: "--accordion-panel-width",
  })

  if (!mounted) return null

  return (
    <div
      id={item.contentId}
      ref={ref as React.Ref<HTMLDivElement>}
      role="region"
      aria-labelledby={item.triggerId}
      data-slot="accordion-content"
      {...presenceAttrs}
      className="overflow-hidden px-4 text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        {...presenceAttrs}
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-4 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

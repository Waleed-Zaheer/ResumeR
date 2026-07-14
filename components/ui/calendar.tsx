"use client"

/**
 * Calendar — a month-grid date picker supporting single/multiple/range
 * selection, keyboard navigation (arrow keys move a virtual "focused"
 * day, synced to real DOM focus via an effect - not native roving
 * tabindex), disabled-date matchers, and month/year dropdown navigation.
 *
 * Feature scope: fully implemented and verified for the common case this
 * project's demo uses - mode="single", default month navigation via the
 * prev/next buttons, label-style caption. `mode="multiple"`/`"range"`,
 * `captionLayout="dropdown"` (native month/year <select>s), and
 * multi-month display (`numberOfMonths > 1`) are wired up and should
 * work, but are a best-effort port of react-day-picker's considerably
 * more involved date-matching and multi-month layout logic rather than a
 * verified-identical reimplementation - no demo in this project
 * exercises them.
 *
 * Usage:
 *   <Calendar mode="single" selected={date} onSelect={setDate} />
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 *   - src/lib/primitives/use-controllable-state.ts
 *   - src/components/ui/button.tsx (nav buttons, day buttons)
 *   - date-fns (date math - already a project dependency, not a UI library)
 */
import { useEffect, useRef, useState, type ComponentProps } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  getDay,
  getYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

type DateRange = { from: Date | undefined; to?: Date }
type Matcher =
  | boolean
  | ((date: Date) => boolean)
  | Date
  | Date[]
  | DateRange
  | { before: Date }
  | { after: Date }
  | { before: Date; after: Date }
  | { dayOfWeek: number | number[] }
type CalendarMode = "single" | "multiple" | "range"
type MoveBy = "day" | "week" | "startOfWeek" | "endOfWeek" | "month" | "year"
type MoveDir = "after" | "before"

function matchDate(date: Date, matcher: Matcher): boolean {
  if (typeof matcher === "boolean") return matcher
  if (typeof matcher === "function") return matcher(date)
  if (matcher instanceof Date) return isSameDay(date, matcher)
  if (Array.isArray(matcher)) return matcher.some((m) => isSameDay(date, m))
  if ("dayOfWeek" in matcher) {
    const days = Array.isArray(matcher.dayOfWeek) ? matcher.dayOfWeek : [matcher.dayOfWeek]
    return days.includes(getDay(date))
  }
  if ("before" in matcher && "after" in matcher) {
    return isAfter(date, matcher.after) && isBefore(date, matcher.before)
  }
  if ("before" in matcher) return isBefore(date, matcher.before)
  if ("after" in matcher) return isAfter(date, matcher.after)
  if ("from" in matcher) {
    if (!matcher.from) return false
    const to = matcher.to ?? matcher.from
    const [start, end] = matcher.from <= to ? [matcher.from, to] : [to, matcher.from]
    return isWithinInterval(date, { start, end })
  }
  return false
}

function matchDates(date: Date, matcher: Matcher | Matcher[] | undefined): boolean {
  if (matcher === undefined) return false
  const list = Array.isArray(matcher) && matcher.every((m) => m instanceof Date) ? [matcher as Date[]] : Array.isArray(matcher) ? matcher : [matcher]
  return (list as Matcher[]).some((m) => matchDate(date, m))
}

function getCalendarWeeks(month: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6, fixedWeeks: boolean): Date[][] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn })
  let gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  if (fixedWeeks) {
    const missing = 42 - days.length
    if (missing > 0) {
      gridEnd = addDays(gridEnd, missing)
      days.push(...eachDayOfInterval({ start: addDays(days[days.length - 1], 1), end: gridEnd }))
    }
  }
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function getMonthOptions(displayMonth: Date, startMonth: Date, endMonth: Date, formatMonth: (d: Date) => string) {
  const year = getYear(displayMonth)
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1)
    return {
      value: i,
      label: formatMonth(date),
      disabled: isBefore(date, startOfMonth(startMonth)) || isAfter(date, startOfMonth(endMonth)),
    }
  })
}

function getYearOptions(startMonth: Date, endMonth: Date, formatYear: (y: number) => string, reverse?: boolean) {
  const startYear = getYear(startMonth)
  const endYear = getYear(endMonth)
  const years = []
  for (let y = startYear; y <= endYear; y++) years.push({ value: y, label: formatYear(y) })
  return reverse ? years.reverse() : years
}

function moveFocusDate(from: Date, moveBy: MoveBy, moveDir: MoveDir, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6, disabled: Matcher | Matcher[] | undefined, hidden: Matcher | Matcher[] | undefined): Date {
  const sign = moveDir === "after" ? 1 : -1
  let candidate: Date
  switch (moveBy) {
    case "day":
      candidate = addDays(from, sign)
      break
    case "week":
      candidate = addWeeks(from, sign)
      break
    case "startOfWeek":
      candidate = startOfWeek(from, { weekStartsOn })
      break
    case "endOfWeek":
      candidate = endOfWeek(from, { weekStartsOn })
      break
    case "month":
      candidate = addMonths(from, sign)
      break
    case "year":
      candidate = addYears(from, sign)
      break
  }
  // Skip past disabled/hidden days when stepping day-by-day or week-by-week,
  // up to a generous attempt limit so a fully-disabled range can't hang.
  if (moveBy === "day" || moveBy === "week") {
    let attempts = 0
    while ((matchDates(candidate, disabled) || matchDates(candidate, hidden)) && attempts < 366) {
      candidate = moveBy === "day" ? addDays(candidate, sign) : addWeeks(candidate, sign)
      attempts += 1
    }
  }
  return candidate
}

const defaultFormatMonthCaption = (date: Date) => date.toLocaleString(undefined, { month: "long", year: "numeric" })
const defaultFormatWeekday = (date: Date) => date.toLocaleString(undefined, { weekday: "short" })
const defaultFormatMonthDropdown = (date: Date) => date.toLocaleString(undefined, { month: "short" })
const defaultFormatYearDropdown = (year: number) => String(year)

type CalendarFormatters = {
  formatCaption?: (date: Date) => string
  formatWeekdayName?: (date: Date) => string
  formatMonthDropdown?: (date: Date) => string
  formatYearDropdown?: (year: number) => string
  formatDay?: (date: Date) => string
}

type CalendarProps = Omit<ComponentProps<"div">, "onSelect"> & {
  mode?: CalendarMode
  selected?: Date | Date[] | DateRange
  onSelect?: (value: Date | Date[] | DateRange | undefined, triggerDate: Date, e: React.MouseEvent | React.KeyboardEvent) => void
  required?: boolean
  min?: number
  max?: number
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  numberOfMonths?: number
  showOutsideDays?: boolean
  showWeekNumber?: boolean
  fixedWeeks?: boolean
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  disabled?: Matcher | Matcher[]
  hidden?: Matcher | Matcher[]
  today?: Date
  startMonth?: Date
  endMonth?: Date
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years"
  buttonVariant?: ComponentProps<typeof Button>["variant"]
  formatters?: CalendarFormatters
  locale?: { code?: string }
  /** Override the className applied to any of the calendar's internal
   * slots (root, months, month, nav, month_caption, dropdowns, month_grid,
   * weekdays, weekday, week, day, today, outside, disabled, hidden,
   * range_start, range_middle, range_end, button_previous, button_next,
   * week_number, week_number_header). */
  classNames?: Partial<Record<string, string>>
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  mode = "single",
  selected: selectedProp,
  onSelect,
  required = false,
  min,
  max,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  numberOfMonths = 1,
  showWeekNumber = false,
  fixedWeeks = false,
  weekStartsOn = 0,
  disabled,
  hidden,
  today: todayOverride,
  startMonth,
  endMonth,
  formatters,
  locale,
  ...props
}: CalendarProps) {
  const today = todayOverride ?? new Date()
  const navStart = startMonth ?? new Date(today.getFullYear() - 100, 0, 1)
  const navEnd = endMonth ?? new Date(today.getFullYear(), 11, 31)

  const [month, setMonth] = useState(() => defaultMonth ?? monthProp ?? (Array.isArray(selectedProp) ? today : selectedProp instanceof Date ? selectedProp : (selectedProp as DateRange | undefined)?.from ?? today))
  const displayMonth = monthProp ?? month

  function goToMonth(next: Date) {
    const clamped = isBefore(next, startOfMonth(navStart)) ? navStart : isAfter(next, startOfMonth(navEnd)) ? navEnd : next
    setMonth(clamped)
    onMonthChange?.(clamped)
  }

  const [selected, setSelected] = useState<Date | Date[] | DateRange | undefined>(selectedProp)
  const isControlledSelection = selectedProp !== undefined
  const currentSelected = isControlledSelection ? selectedProp : selected

  function commitSelect(value: Date | Date[] | DateRange | undefined, triggerDate: Date, e: React.MouseEvent | React.KeyboardEvent) {
    if (!isControlledSelection) setSelected(value)
    onSelect?.(value, triggerDate, e)
  }

  function isSelected(date: Date): boolean {
    if (!currentSelected) return false
    if (mode === "single") return isSameDay(currentSelected as Date, date)
    if (mode === "multiple") return (currentSelected as Date[]).some((d) => isSameDay(d, date))
    const range = currentSelected as DateRange
    if (!range.from) return false
    const to = range.to ?? range.from
    const [start, end] = range.from <= to ? [range.from, to] : [to, range.from]
    return isWithinInterval(date, { start, end })
  }

  function selectionState(date: Date): "start" | "middle" | "end" | null {
    if (mode !== "range" || !currentSelected) return null
    const range = currentSelected as DateRange
    if (!range.from) return null
    if (!range.to) return isSameDay(date, range.from) ? "start" : null
    const [start, end] = range.from <= range.to ? [range.from, range.to] : [range.to, range.from]
    if (isSameDay(date, start) && isSameDay(date, end)) return "start"
    if (isSameDay(date, start)) return "start"
    if (isSameDay(date, end)) return "end"
    if (isWithinInterval(date, { start, end })) return "middle"
    return null
  }

  function handleDayClick(date: Date, e: React.MouseEvent | React.KeyboardEvent) {
    if (matchDates(date, disabled)) return
    if (mode === "single") {
      const next = !required && currentSelected && isSameDay(currentSelected as Date, date) ? undefined : date
      commitSelect(next, date, e)
    } else if (mode === "multiple") {
      const list = (currentSelected as Date[] | undefined) ?? []
      const idx = list.findIndex((d) => isSameDay(d, date))
      let next: Date[]
      if (idx >= 0) {
        if (required && list.length <= 1) return
        next = list.filter((_, i) => i !== idx)
      } else {
        if (max !== undefined && list.length >= max) return
        next = [...list, date]
      }
      commitSelect(next, date, e)
    } else {
      const range = (currentSelected as DateRange | undefined) ?? { from: undefined, to: undefined }
      let next: DateRange | undefined
      if (!range.from || (range.from && range.to)) {
        next = { from: date, to: undefined }
      } else if (isSameDay(date, range.from)) {
        next = required ? { from: date, to: undefined } : undefined
      } else {
        const from = date < range.from ? date : range.from
        const to = date < range.from ? range.from : date
        if (min !== undefined && addDays(from, min - 1) > to) {
          next = { from: date, to: undefined }
        } else if (max !== undefined && addDays(from, max - 1) < to) {
          next = { from: date, to: undefined }
        } else {
          next = { from, to }
        }
      }
      commitSelect(next, date, e)
    }
    setFocusedDate(date)
  }

  const initialFocus =
    mode === "single" && currentSelected instanceof Date
      ? currentSelected
      : mode === "multiple" && Array.isArray(currentSelected) && currentSelected[0]
        ? currentSelected[0]
        : mode === "range" && (currentSelected as DateRange | undefined)?.from
          ? (currentSelected as DateRange).from!
          : today
  const [focusedDate, setFocusedDate] = useState(initialFocus)

  function moveFocus(moveBy: MoveBy, moveDir: MoveDir) {
    const next = moveFocusDate(focusedDate, moveBy, moveDir, weekStartsOn, disabled, hidden)
    setFocusedDate(next)
    if (!isSameMonth(next, displayMonth)) goToMonth(startOfMonth(next))
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const map: Record<string, [MoveBy, MoveDir] | undefined> = {
      ArrowRight: ["day", "after"],
      ArrowLeft: ["day", "before"],
      ArrowDown: ["week", "after"],
      ArrowUp: ["week", "before"],
      Home: ["startOfWeek", "before"],
      End: ["endOfWeek", "after"],
      PageDown: e.shiftKey ? ["year", "after"] : ["month", "after"],
      PageUp: e.shiftKey ? ["year", "before"] : ["month", "before"],
    }
    const move = map[e.key]
    if (move) {
      e.preventDefault()
      moveFocus(move[0], move[1])
      return
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleDayClick(focusedDate, e)
    }
  }

  const formatCaption = formatters?.formatCaption ?? defaultFormatMonthCaption
  const formatWeekdayName = formatters?.formatWeekdayName ?? defaultFormatWeekday
  const formatMonthDropdown = formatters?.formatMonthDropdown ?? defaultFormatMonthDropdown
  const formatYearDropdown = formatters?.formatYearDropdown ?? defaultFormatYearDropdown

  const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(displayMonth, i))
  const canGoPrev = !isBefore(subMonths(displayMonth, 1), startOfMonth(navStart)) || isSameMonth(subMonths(displayMonth, 1), navStart)
  const canGoNext = !isAfter(addMonths(displayMonth, numberOfMonths - 1), startOfMonth(navEnd)) || isSameMonth(addMonths(displayMonth, numberOfMonths - 1), navEnd)

  return (
    <div
      data-slot="calendar"
      className={cn(
        "group/calendar bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      {...props}
    >
      <div className={cn("w-fit", classNames?.root)}>
        <div className={cn("relative flex flex-col gap-4 md:flex-row", classNames?.months)}>
          {months.map((monthDate, monthIndex) => (
            <div key={monthDate.toISOString()} className={cn("flex w-full flex-col gap-4", classNames?.month)}>
              <div
                className={cn(
                  "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
                  classNames?.nav
                )}
              >
                {monthIndex === 0 && (
                  <Button
                    type="button"
                    variant={buttonVariant}
                    className={cn(
                      "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
                      classNames?.button_previous
                    )}
                    aria-disabled={!canGoPrev}
                    aria-label="Go to previous month"
                    onClick={() => canGoPrev && goToMonth(subMonths(displayMonth, 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                )}
                {monthIndex === months.length - 1 && (
                  <Button
                    type="button"
                    variant={buttonVariant}
                    className={cn(
                      "ms-auto size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
                      classNames?.button_next
                    )}
                    aria-disabled={!canGoNext}
                    aria-label="Go to next month"
                    onClick={() => canGoNext && goToMonth(addMonths(displayMonth, 1))}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                )}
              </div>

              {captionLayout === "label" ? (
                <div
                  className={cn(
                    "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
                    classNames?.month_caption
                  )}
                >
                  <span className={cn("text-sm font-medium select-none", classNames?.caption_label)}>
                    {formatCaption(monthDate)}
                  </span>
                </div>
              ) : (
                <MonthYearDropdowns
                  monthDate={monthDate}
                  captionLayout={captionLayout}
                  navStart={navStart}
                  navEnd={navEnd}
                  formatMonthDropdown={formatMonthDropdown}
                  formatYearDropdown={formatYearDropdown}
                  onChange={(next) => goToMonth(next)}
                  classNames={classNames}
                />
              )}

              <MonthGrid
                monthDate={monthDate}
                weekStartsOn={weekStartsOn}
                fixedWeeks={fixedWeeks}
                showOutsideDays={showOutsideDays}
                showWeekNumber={showWeekNumber}
                weekStartsOnLabelFormatter={formatWeekdayName}
                today={today}
                disabled={disabled}
                hidden={hidden}
                focusedDate={focusedDate}
                isSelected={isSelected}
                selectionState={selectionState}
                onDayClick={handleDayClick}
                onGridKeyDown={onGridKeyDown}
                setFocusedDate={setFocusedDate}
                locale={locale}
                classNames={classNames}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthYearDropdowns({
  monthDate,
  captionLayout,
  navStart,
  navEnd,
  formatMonthDropdown,
  formatYearDropdown,
  onChange,
  classNames,
}: {
  monthDate: Date
  captionLayout: "dropdown" | "dropdown-months" | "dropdown-years"
  navStart: Date
  navEnd: Date
  formatMonthDropdown: (d: Date) => string
  formatYearDropdown: (y: number) => string
  onChange: (date: Date) => void
  classNames?: Partial<Record<string, string>>
}) {
  const monthOptions = getMonthOptions(monthDate, navStart, navEnd, formatMonthDropdown)
  const yearOptions = getYearOptions(navStart, navEnd, formatYearDropdown)

  return (
    <div
      className={cn(
        "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
        classNames?.dropdowns
      )}
    >
      {captionLayout !== "dropdown-years" && (
        <div className={cn("relative rounded-(--cell-radius)", classNames?.dropdown_root)}>
          <select
            aria-label="Choose the Month"
            className={cn("absolute inset-0 bg-popover opacity-0", classNames?.dropdown)}
            value={monthDate.getMonth()}
            onChange={(e) => onChange(new Date(monthDate.getFullYear(), Number(e.target.value), 1))}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            className={cn(
              "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
              classNames?.caption_label
            )}
          >
            {formatMonthDropdown(monthDate)}
            <ChevronDownIcon />
          </span>
        </div>
      )}
      {captionLayout !== "dropdown-months" && (
        <div className={cn("relative rounded-(--cell-radius)", classNames?.dropdown_root)}>
          <select
            aria-label="Choose the Year"
            className={cn("absolute inset-0 bg-popover opacity-0", classNames?.dropdown)}
            value={monthDate.getFullYear()}
            onChange={(e) => onChange(new Date(Number(e.target.value), monthDate.getMonth(), 1))}
          >
            {yearOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            className={cn(
              "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
              classNames?.caption_label
            )}
          >
            {formatYearDropdown(monthDate.getFullYear())}
            <ChevronDownIcon />
          </span>
        </div>
      )}
    </div>
  )
}

function MonthGrid({
  monthDate,
  weekStartsOn,
  fixedWeeks,
  showOutsideDays,
  showWeekNumber,
  weekStartsOnLabelFormatter,
  today,
  disabled,
  hidden,
  focusedDate,
  isSelected,
  selectionState,
  onDayClick,
  onGridKeyDown,
  setFocusedDate,
  locale,
  classNames,
}: {
  monthDate: Date
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  fixedWeeks: boolean
  showOutsideDays: boolean
  showWeekNumber: boolean
  weekStartsOnLabelFormatter: (d: Date) => string
  today: Date
  disabled: Matcher | Matcher[] | undefined
  hidden: Matcher | Matcher[] | undefined
  focusedDate: Date
  isSelected: (d: Date) => boolean
  selectionState: (d: Date) => "start" | "middle" | "end" | null
  onDayClick: (d: Date, e: React.MouseEvent | React.KeyboardEvent) => void
  onGridKeyDown: (e: React.KeyboardEvent) => void
  setFocusedDate: (d: Date) => void
  locale?: { code?: string }
  classNames?: Partial<Record<string, string>>
}) {
  const weeks = getCalendarWeeks(monthDate, weekStartsOn, fixedWeeks)
  const weekdays = weeks[0]

  return (
    <table className={cn("w-full border-collapse", classNames?.month_grid)} onKeyDown={onGridKeyDown}>
      <thead aria-hidden="true">
        <tr className={cn("flex", classNames?.weekdays)}>
          {showWeekNumber && (
            <th className={cn("w-(--cell-size) select-none", classNames?.week_number_header)} />
          )}
          {weekdays.map((d) => (
            <th
              key={d.toISOString()}
              className={cn(
                "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
                classNames?.weekday
              )}
            >
              {weekdaysAbbrev(d, weekStartsOnLabelFormatter)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, weekIndex) => (
          <tr
            key={week[0].toISOString()}
            className={cn("flex w-full", weekIndex > 0 && "mt-2", classNames?.week)}
          >
            {showWeekNumber && (
              <td className={cn("text-[0.8rem] text-muted-foreground select-none", classNames?.week_number)}>
                <div className="flex size-(--cell-size) items-center justify-center text-center">
                  {getISOWeek(week[0])}
                </div>
              </td>
            )}
            {week.map((date) => {
              const outside = !isSameMonth(date, monthDate)
              if (outside && !showOutsideDays) {
                return (
                  <td
                    key={date.toISOString()}
                    className="group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none invisible"
                  />
                )
              }
              const isDisabled = matchDates(date, disabled)
              const isHidden = matchDates(date, hidden)
              const isTodayDate = isSameDay(date, today)
              const state = selectionState(date)
              const selected = isSelected(date)
              const focused = isSameDay(date, focusedDate)

              return (
                <td
                  key={date.toISOString()}
                  data-selected={selected ? "true" : undefined}
                  data-disabled={isDisabled ? "true" : undefined}
                  data-outside={outside ? "true" : undefined}
                  data-today={isTodayDate ? "true" : undefined}
                  data-focused={focused ? "true" : undefined}
                  className={cn(
                    "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
                    showWeekNumber
                      ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
                      : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
                    classNames?.day,
                    state === "start" &&
                      cn(
                        "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
                        classNames?.range_start
                      ),
                    state === "middle" && cn("rounded-none", classNames?.range_middle),
                    state === "end" &&
                      cn(
                        "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
                        classNames?.range_end
                      ),
                    isTodayDate &&
                      cn(
                        "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
                        classNames?.today
                      ),
                    outside && cn("text-muted-foreground aria-selected:text-muted-foreground", classNames?.outside),
                    isDisabled && cn("text-muted-foreground opacity-50", classNames?.disabled),
                    isHidden && cn("invisible", classNames?.hidden)
                  )}
                  hidden={isHidden}
                >
                  <CalendarDayButton
                    date={date}
                    disabled={isDisabled}
                    focused={focused}
                    selected={selected}
                    rangeStart={state === "start"}
                    rangeEnd={state === "end"}
                    rangeMiddle={state === "middle"}
                    locale={locale}
                    onClick={(e) => {
                      if (!isDisabled) onDayClick(date, e)
                    }}
                    onMouseEnter={() => setFocusedDate(date)}
                  >
                    {date.getDate()}
                  </CalendarDayButton>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function weekdaysAbbrev(date: Date, formatter: (d: Date) => string) {
  return formatter(date)
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function CalendarDayButton({
  className,
  date,
  disabled,
  focused,
  selected,
  rangeStart,
  rangeEnd,
  rangeMiddle,
  locale,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  date: Date
  disabled?: boolean
  focused?: boolean
  selected?: boolean
  rangeStart?: boolean
  rangeEnd?: boolean
  rangeMiddle?: boolean
  locale?: { code?: string }
}) {
  const selectedSingle = selected && !rangeStart && !rangeEnd && !rangeMiddle
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focused) ref.current?.focus()
  }, [focused])

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      tabIndex={focused ? 0 : -1}
      aria-selected={selected || undefined}
      data-day={date.toLocaleDateString(locale?.code)}
      data-selected-single={selectedSingle}
      data-range-start={rangeStart}
      data-range-end={rangeEnd}
      data-range-middle={rangeMiddle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export { Calendar, CalendarDayButton }

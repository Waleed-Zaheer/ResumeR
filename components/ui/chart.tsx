"use client"

/**
 * Chart — a themeable wrapper around a small hand-rolled SVG bar-chart
 * engine (no `recharts` dependency). `ChartContainer` measures its own
 * size (replacing recharts' `ResponsiveContainer`) and injects
 * per-series CSS custom properties (`--color-<key>`) from a
 * `ChartConfig` so series can be styled with `fill="var(--color-x)"`.
 *
 * Feature scope: only a vertical (categorical) `BarChart` is
 * implemented - `CartesianGrid` (horizontal lines; `vertical` lines
 * are a best-effort, unverified addition), a category `XAxis`, a
 * hover `ChartTooltip`/`ChartTooltipContent`, and `ChartLegend`/
 * `ChartLegendContent`. Multiple `<Bar>` children render as a grouped
 * bar chart; a `<Bar>` can also take one `<Cell fill="..."/>` per data
 * row to color each bar individually instead of one uniform fill
 * (matches recharts' real `<Cell>` API). recharts' `LineChart`/`AreaChart`/`PieChart`/
 * `RadialBarChart`, `YAxis`, `ReferenceLine`, and the `plugins`-style
 * customization surface are not implemented - no demo in this project
 * uses them. The Y-axis "nice" tick values are computed with a
 * standard nearest-1/2/5 rounding algorithm, which approximates but
 * does not byte-for-byte match recharts' own tick generation.
 * X-axis tick text intentionally keeps an inline `fill="#666"` (not
 * `--muted-foreground`) to match this project's actual pre-rewrite
 * rendering: the original `[&_.recharts-cartesian-axis-tick_text]`
 * selector in `ChartContainer`'s className never matched recharts
 * 3.x's real DOM (a pre-existing upstream mismatch), so tick text has
 * always rendered as a fixed gray, in both themes.
 *
 * Usage:
 *   const config = { value: { label: "Value", color: "var(--primary)" } } satisfies ChartConfig
 *   <ChartContainer config={config} className="w-full max-w-sm">
 *     <BarChart data={data}>
 *       <CartesianGrid vertical={false} />
 *       <XAxis dataKey="month" tickLine={false} axisLine={false} />
 *       <ChartTooltip content={<ChartTooltipContent />} />
 *       <Bar dataKey="value" fill="var(--color-value)" radius={4} />
 *     </BarChart>
 *   </ChartContainer>
 *
 * Depends on:
 *   - src/lib/utils.ts (cn helper)
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

const INITIAL_DIMENSION = { width: 320, height: 200 } as const

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

function useChart() {
  const context = useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartSizeContext = createContext<{ width: number; height: number }>(INITIAL_DIMENSION)

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: ComponentProps<"div"> & {
  config: ChartConfig
  children: ReactNode
  initialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState(initialDimension)

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height })
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <div ref={wrapperRef} className="recharts-responsive-container min-w-0 flex-1">
          <ChartSizeContext.Provider value={size}>{children}</ChartSizeContext.Provider>
        </div>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme ?? config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Chart primitives (replace recharts' <BarChart>/<Bar>/<CartesianGrid>/<XAxis>)
// ---------------------------------------------------------------------------

type CellProps = {
  fill?: string
}

/** Marker component - see {@link Bar}. Pass one `<Cell>` per data row inside
 * a `<Bar>` to color each bar individually instead of using one uniform
 * `fill` for the whole series (matches recharts' real `<Cell>` API). */
function Cell(_props: CellProps): null {
  return null
}

type BarProps = {
  dataKey: string
  fill?: string
  radius?: number
  name?: string
  /** `<Cell fill="..."/>` children, one per data row, for per-bar colors. */
  children?: ReactNode
}

/** Marker component - never rendered directly. `<BarChart>` reads its props
 * off the element (by `type` identity) to build the chart, the same way
 * recharts' own chart primitives work. */
function Bar(_props: BarProps): null {
  return null
}

type CartesianGridProps = {
  vertical?: boolean
  horizontal?: boolean
}

/** Marker component - see {@link Bar}. `vertical` line rendering is a
 * best-effort addition not exercised by any demo in this project. */
function CartesianGrid(_props: CartesianGridProps): null {
  return null
}

type XAxisProps = {
  dataKey?: string
  tickLine?: boolean
  axisLine?: boolean
}

/** Marker component - see {@link Bar}. Category axis only. */
function XAxis(_props: XAxisProps): null {
  return null
}

type ChartTooltipPayloadItem = {
  dataKey?: string
  name?: string
  value?: number | string
  color?: string
  fill?: string
  payload?: Record<string, unknown>
  type?: string
}

type ChartTooltipProps = {
  content?: ReactElement<{
    active?: boolean
    payload?: ChartTooltipPayloadItem[]
    label?: ReactNode
  }>
  cursor?: boolean
}

/** Marker component - see {@link Bar}. */
function ChartTooltip(_props: ChartTooltipProps): null {
  return null
}

type ChartLegendPayloadItem = {
  value?: ReactNode
  dataKey?: string
  color?: string
  type?: string
}

type ChartLegendProps = {
  content?: ReactElement<{ payload?: ChartLegendPayloadItem[] }>
  verticalAlign?: "top" | "bottom"
}

/** Marker component - see {@link Bar}. */
function ChartLegend(_props: ChartLegendProps): null {
  return null
}

const DEFAULT_MARGIN = { top: 5, right: 5, bottom: 5, left: 5 }
const AXIS_HEIGHT = 30
const BAR_CATEGORY_GAP_RATIO = 0.1
const TICK_MARGIN = 2

function niceNum(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }
  return niceFraction * 10 ** exponent
}

function computeNiceTicks(max: number, targetCount: number) {
  if (max <= 0) return [0, 1]
  const range = niceNum(max, false)
  const step = niceNum(range / (targetCount - 1), true)
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Math.round(v / step) * step)
  }
  return ticks
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  if (r === 0) {
    return `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`
  }
  return `M ${x},${y + r} A ${r},${r},0,0,1,${x + r},${y} L ${x + w - r},${y} A ${r},${r},0,0,1,${x + w},${y + r} L ${x + w},${y + h - r} A ${r},${r},0,0,1,${x + w - r},${y + h} L ${x + r},${y + h} A ${r},${r},0,0,1,${x},${y + h - r} Z`
}

/** Extracts the `fill` of each `<Cell>` passed as a `<Bar>`'s children,
 * in order, for per-bar coloring. */
function getCellFills(children: ReactNode): (string | undefined)[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<CellProps> => isValidElement(child) && child.type === Cell)
    .map((cell) => cell.props.fill)
}

function BarChart({
  data,
  margin: marginProp,
  className,
  style,
  children,
}: {
  data: Record<string, unknown>[]
  margin?: Partial<typeof DEFAULT_MARGIN>
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const { width, height } = useContext(ChartSizeContext)
  const margin = { ...DEFAULT_MARGIN, ...marginProp }
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Children are inspected declaratively (find/filter/map, no mutation) so
  // each config is a plain `const` TypeScript can narrow normally - a `let`
  // reassigned only inside a Children.forEach callback doesn't narrow
  // reliably across the rest of this function.
  const childArray = Children.toArray(children)
  const isBar = (child: unknown): child is ReactElement<BarProps> =>
    isValidElement(child) && child.type === Bar
  const isGrid = (child: unknown): child is ReactElement<CartesianGridProps> =>
    isValidElement(child) && child.type === CartesianGrid
  const isXAxis = (child: unknown): child is ReactElement<XAxisProps> =>
    isValidElement(child) && child.type === XAxis
  const isTooltip = (child: unknown): child is ReactElement<ChartTooltipProps> =>
    isValidElement(child) && child.type === ChartTooltip
  const isLegend = (child: unknown): child is ReactElement<ChartLegendProps> =>
    isValidElement(child) && child.type === ChartLegend

  const barConfigs = childArray.filter(isBar).map((child) => child.props)
  const gridConfig = childArray.find(isGrid)?.props ?? null
  const xAxisConfig = childArray.find(isXAxis)?.props ?? null
  const tooltipConfig = childArray.find(isTooltip)?.props ?? null
  const legendConfig = childArray.find(isLegend)?.props ?? null

  const bottomAxisSpace = xAxisConfig ? AXIS_HEIGHT : 0
  const legendAlign = legendConfig ? (legendConfig.verticalAlign ?? "bottom") : null

  const plotLeft = margin.left
  const plotTop = margin.top
  const plotWidth = Math.max(0, width - margin.left - margin.right)
  const plotHeight = Math.max(0, height - margin.top - margin.bottom - bottomAxisSpace)
  const plotBottom = plotTop + plotHeight

  const n = data.length
  const bandFull = n > 0 ? plotWidth / n : 0
  const bandwidth = bandFull * (1 - BAR_CATEGORY_GAP_RATIO)
  const bandOffset = (bandFull - bandwidth) / 2
  const seriesCount = Math.max(1, barConfigs.length)
  const seriesBandwidth = bandwidth / seriesCount

  const dataMax = useMemo(() => {
    let max = 0
    for (const row of data) {
      for (const bar of barConfigs) {
        const value = Number(row[bar.dataKey]) || 0
        if (value > max) max = value
      }
    }
    return max
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, barConfigs.map((b) => b.dataKey).join(",")])

  const yTicks = useMemo(() => computeNiceTicks(dataMax, 5), [dataMax])
  const niceMax = yTicks[yTicks.length - 1] ?? 1

  function xBandLeft(index: number) {
    return plotLeft + index * bandFull
  }
  function yScale(value: number) {
    return plotBottom - (value / (niceMax || 1)) * plotHeight
  }

  function handleMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    if (mouseX < plotLeft || mouseX > plotLeft + plotWidth || mouseY < plotTop || mouseY > plotBottom) {
      setActiveIndex(null)
      return
    }
    const idx = Math.floor((mouseX - plotLeft) / bandFull)
    setActiveIndex(idx >= 0 && idx < n ? idx : null)
  }
  function handleMouseLeave() {
    setActiveIndex(null)
  }

  const activeRow = activeIndex !== null ? data[activeIndex] : null
  const tooltipPayload: ChartTooltipPayloadItem[] = activeRow
    ? barConfigs.map((bar) => {
        const activeFill = activeIndex !== null ? getCellFills(bar.children)[activeIndex] : undefined
        const fill = activeFill ?? bar.fill
        return {
          dataKey: bar.dataKey,
          name: bar.name ?? bar.dataKey,
          value: activeRow[bar.dataKey] as number | string,
          color: fill,
          fill,
          payload: activeRow,
        }
      })
    : []

  const legendPayload: ChartLegendPayloadItem[] = barConfigs.map((bar) => ({
    value: bar.name ?? bar.dataKey,
    dataKey: bar.dataKey,
    color: bar.fill,
    type: "rect",
  }))

  const legendNode = legendConfig?.content
    ? cloneElement(legendConfig.content, { payload: legendPayload })
    : null
  const tooltipContent = tooltipConfig?.content ?? null
  const xAxisDataKey = xAxisConfig?.dataKey

  return (
    <div className={cn("recharts-wrapper relative", className)} style={{ width, height, cursor: "default", ...style }}>
      {legendNode && legendAlign === "top" ? legendNode : null}
      <svg
        ref={svgRef}
        className="recharts-surface"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {gridConfig ? (
          <g className="recharts-layer recharts-cartesian-grid">
            {gridConfig.horizontal !== false ? (
              <g className="recharts-cartesian-grid-horizontal">
                {yTicks.map((tick) => (
                  <line
                    key={tick}
                    x1={plotLeft}
                    x2={plotLeft + plotWidth}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                    stroke="#ccc"
                  />
                ))}
              </g>
            ) : null}
            {gridConfig.vertical ? (
              <g className="recharts-cartesian-grid-vertical">
                {Array.from({ length: n + 1 }, (_, i) => (
                  <line key={i} x1={xBandLeft(i)} x2={xBandLeft(i)} y1={plotTop} y2={plotBottom} stroke="#ccc" />
                ))}
              </g>
            ) : null}
          </g>
        ) : null}

        {activeIndex !== null && tooltipConfig && tooltipConfig.cursor !== false ? (
          <path
            className="recharts-rectangle recharts-tooltip-cursor"
            d={roundedRectPath(xBandLeft(activeIndex), plotTop, bandFull, plotHeight, 0)}
            stroke="none"
            fill="#ccc"
          />
        ) : null}

        <g className="recharts-layer recharts-bar-rectangles">
          {barConfigs.map((bar, seriesIndex) => {
            const cellFills = getCellFills(bar.children)
            return data.map((row, i) => {
              const value = Number(row[bar.dataKey]) || 0
              const barX = xBandLeft(i) + bandOffset + seriesIndex * seriesBandwidth
              const barY = yScale(value)
              const barH = Math.max(0, plotBottom - barY)
              return (
                <g key={`${bar.dataKey}-${i}`} className="recharts-layer recharts-bar-rectangle">
                  <path
                    className="recharts-rectangle"
                    d={roundedRectPath(barX, barY, seriesBandwidth, barH, bar.radius ?? 0)}
                    fill={cellFills[i] ?? bar.fill}
                  />
                </g>
              )
            })
          })}
        </g>

        {xAxisConfig ? (
          <g className="recharts-cartesian-axis-tick-labels">
            {data.map((row, i) => {
              const label = xAxisDataKey ? String(row[xAxisDataKey] ?? "") : ""
              return (
                <g key={i} className="recharts-layer recharts-cartesian-axis-tick-label">
                  <text
                    x={xBandLeft(i) + bandFull / 2}
                    y={plotBottom + TICK_MARGIN + 12}
                    textAnchor="middle"
                    className="recharts-text recharts-cartesian-axis-tick-value"
                    fill="#666"
                  >
                    {label}
                  </text>
                </g>
              )
            })}
          </g>
        ) : null}

        {xAxisConfig && xAxisConfig.axisLine !== false ? (
          <line
            className="recharts-cartesian-axis-line"
            x1={plotLeft}
            x2={plotLeft + plotWidth}
            y1={plotBottom}
            y2={plotBottom}
            stroke="#666"
          />
        ) : null}

        {xAxisConfig && xAxisConfig.tickLine !== false
          ? data.map((_, i) => (
              <line
                key={i}
                x1={xBandLeft(i) + bandFull / 2}
                x2={xBandLeft(i) + bandFull / 2}
                y1={plotBottom}
                y2={plotBottom + 6}
                stroke="#666"
              />
            ))
          : null}
      </svg>

      {legendNode && legendAlign !== "top" ? legendNode : null}

      {activeIndex !== null && activeRow && tooltipContent ? (
        <div
          style={{
            position: "absolute",
            left: xBandLeft(activeIndex) + bandFull / 2,
            top: yScale(Number(activeRow[barConfigs[0]?.dataKey ?? ""]) || 0),
            transform: "translate(-50%, calc(-100% - 8px))",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {cloneElement(tooltipContent, {
            active: true,
            payload: tooltipPayload,
            label: xAxisDataKey ? String(activeRow[xAxisDataKey] ?? "") : undefined,
          })}
        </div>
      ) : null}
    </div>
  )
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ComponentProps<"div"> & {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: ReactNode
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelFormatter?: (label: ReactNode, payload: ChartTooltipPayloadItem[]) => ReactNode
  labelClassName?: string
  formatter?: (
    value: ChartTooltipPayloadItem["value"],
    name: ChartTooltipPayloadItem["name"],
    item: ChartTooltipPayloadItem,
    index: number,
    payload: ChartTooltipPayloadItem["payload"]
  ) => ReactNode
  color?: string
}) {
  const { config } = useChart()

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ])

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-xl bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color ?? item.payload?.fill ?? item.color

            return (
              <div
                key={index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
  payload?: ChartLegendPayloadItem[]
  verticalAlign?: "top" | "bottom"
}) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
}

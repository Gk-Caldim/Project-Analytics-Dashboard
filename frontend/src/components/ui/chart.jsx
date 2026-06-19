import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "../../lib/utils"

const ChartContext = React.createContext(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer.")
  }
  return context
}

const ChartContainer = React.forwardRef(({ id, className, config, children, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-[10px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-slate-200/80 [&_.recharts-cartesian-grid-vertical_line]:stroke-slate-200/80 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-slate-800/80 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-slate-800/80 [&_.recharts-chart-grid-axis-line]:stroke-slate-200 dark:[&_.recharts-chart-grid-axis-line]:stroke-slate-800 [&_.recharts-curve.recharts-area]:fill-opacity-40 [&_.recharts-stroke-none]:fill-transparent [&_.recharts-active-dot]:stroke-white dark:[&_.recharts-active-dot]:stroke-slate-950",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.color
  )

  if (colorConfig.length === 0) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        [id="${id}"] {
          ${colorConfig
            .map(
              ([key, itemConfig]) => `
            --color-${key}: ${itemConfig.color};
          `
            )
            .join("\n")}
        }
      `,
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef(
  (
    {
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
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !active || !payload?.length) {
        return null
      }

      const [item] = payload

      if (!item) {
        return null
      }

      const key = `${nameKey || item.name || item.dataKey || "value"}`
      const itemConfig = config[key]
      const value =
        labelKey || itemConfig?.label || label || item.payload[nameKey] || item.name

      if (labelFormatter) {
        return (
          <div className={cn("font-bold text-slate-800 dark:text-slate-200 mb-1", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-bold text-slate-800 dark:text-slate-200 mb-1", labelClassName)}>{value}</div>
    }, [
      active,
      payload,
      label,
      labelFormatter,
      labelClassName,
      hideLabel,
      nameKey,
      labelKey,
      config,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "line"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95",
          className
        )}
      >
        {!nestLabel && tooltipLabel}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key]
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  "flex w-full items-center gap-1.5 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-slate-500 dark:[&>svg]:text-slate-400",
                  indicator === "nested" && "before:h-2 before:w-2 before:rounded-[2px] before:bg-[--color-bg]"
                )}
              >
                {itemConfig?.icon ? (
                  <itemConfig.icon />
                ) : (
                  !hideIndicator && (
                    <div
                      className={cn(
                        "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                        indicator === "dot" && "h-2 w-2 rounded-full",
                        indicator === "line" && "w-0.5 h-3",
                        indicator === "dashed" &&
                          "w-0 border-t border-dashed bg-transparent"
                      )}
                      style={{
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      }}
                    />
                  )
                )}
                <div
                  className={cn(
                    "flex flex-1 items-center justify-between gap-1.5 leading-none",
                    nestLabel && "flex-col items-start gap-0.5"
                  )}
                >
                  <div className="grid gap-0.5">
                    {nestLabel && tooltipLabel}
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {itemConfig?.label || item.name}
                    </span>
                  </div>
                  {item.value !== undefined && (
                    <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatter ? formatter(item.value, item.name, item, index, payload) : item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4 flex-wrap",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = config[key]

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-slate-500 dark:[&>svg]:text-slate-400"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {itemConfig?.label || item.value}
              </span>
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

import { useMemo, useRef, useState } from 'react'
import { PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CHART_SIZE = 220
const CHART_RADIUS = 76
const BASE_STROKE = 24
const CIRCUMFERENCE = 2 * Math.PI * CHART_RADIUS

function withAlpha(hex, alpha) {
  const normalized = hex.replace('#', '')

  if (normalized.length === 3) {
    const r = parseInt(`${normalized[0]}${normalized[0]}`, 16)
    const g = parseInt(`${normalized[1]}${normalized[1]}`, 16)
    const b = parseInt(`${normalized[2]}${normalized[2]}`, 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return hex
}

export default function TicketPieChartCard({
  title,
  subtitle,
  data,
  total,
  totalLabel,
  icon: Icon,
}) {
  const chartRef = useRef(null)
  const [activeKey, setActiveKey] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  const segments = useMemo(() => {
    return data
      .reduce(
        (acc, item) => {
          const ratio = total > 0 ? item.value / total : 0
          const length = ratio * CIRCUMFERENCE
          const segment = {
            ...item,
            ratio,
            percent: Math.round(ratio * 100),
            length,
            offset: acc.offset,
          }

          return {
            offset: acc.offset + length,
            segments: [...acc.segments, segment],
          }
        },
        { offset: 0, segments: [] }
      )
      .segments
  }, [data, total])

  const hasData = total > 0

  const handleSegmentHover = (event, segment) => {
    if (!chartRef.current) return

    const rect = chartRef.current.getBoundingClientRect()
    setActiveKey(segment.key)
    setTooltip({
      label: segment.label,
      value: segment.value,
      percent: segment.percent,
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
    })
  }

  return (
    <Card className="group rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/70">
            {Icon ? <Icon className="h-4 w-4" /> : <PieChart className="h-4 w-4" />}
          </span>
          <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
        <div className="mt-3 h-px w-full bg-slate-200" />
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div ref={chartRef} className="relative mx-auto h-[220px] w-[220px]">
              {hasData ? (
                <svg
                  viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
                  className="h-full w-full"
                  role="img"
                  aria-label={`${title} pie chart`}
                >
                  <circle
                    cx={CHART_SIZE / 2}
                    cy={CHART_SIZE / 2}
                    r={CHART_RADIUS}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={BASE_STROKE}
                  />

                  {segments
                    .filter((segment) => segment.length > 0)
                    .map((segment, index) => {
                      const isActive = activeKey === segment.key
                      const isMuted = activeKey && !isActive

                      return (
                        <circle
                          key={`${segment.key}-${segment.value}-${total}`}
                          cx={CHART_SIZE / 2}
                          cy={CHART_SIZE / 2}
                          r={CHART_RADIUS}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth={isActive ? BASE_STROKE + 5 : BASE_STROKE}
                          strokeDasharray={`${segment.length} ${CIRCUMFERENCE}`}
                          strokeDashoffset={-segment.offset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}
                          onMouseEnter={(event) => handleSegmentHover(event, segment)}
                          onMouseMove={(event) => handleSegmentHover(event, segment)}
                          onMouseLeave={() => {
                            setActiveKey(null)
                            setTooltip(null)
                          }}
                          style={{
                            cursor: 'pointer',
                            opacity: isMuted ? 0.35 : 1,
                            filter: isActive
                              ? `drop-shadow(0 0 8px ${withAlpha(segment.color, 0.55)})`
                              : 'none',
                            animation: 'ticketPieReveal 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
                            animationDelay: `${index * 90}ms`,
                            transition:
                              'stroke-width 200ms ease, opacity 200ms ease, filter 200ms ease',
                          }}
                        >
                          <title>{`${segment.label}: ${segment.value} (${segment.percent}%)`}</title>
                        </circle>
                      )
                    })}
                </svg>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">No Data</p>
                </div>
              )}

              <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{totalLabel}</p>
                <p className="text-xl font-bold text-slate-900">{total}</p>
              </div>

              {tooltip && (
                <div
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-md"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  <p className="font-semibold text-slate-900">{tooltip.label}</p>
                  <p className="text-slate-600">{tooltip.value} tickets • {tooltip.percent}%</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {segments.map((segment) => {
              const isActive = activeKey === segment.key
              const isMuted = activeKey && !isActive

              return (
                <div
                  key={segment.key}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-200 hover:border-slate-300 hover:bg-white"
                  onMouseEnter={() => setActiveKey(segment.key)}
                  onMouseLeave={() => setActiveKey(null)}
                  style={{ opacity: isMuted ? 0.45 : 1 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: segment.color }}
                      />
                      <p className="truncate text-sm font-semibold text-slate-900">{segment.label}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-600">{segment.value} tickets</p>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/90">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${segment.percent}%`,
                          background: `linear-gradient(90deg, ${segment.color} 0%, ${withAlpha(segment.color, 0.55)} 100%)`,
                          transformOrigin: 'left center',
                          animation: 'ticketBarGrow 700ms ease-out both',
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-slate-700">{segment.percent}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

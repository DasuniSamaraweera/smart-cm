import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function buildPieGradient(data, total) {
  if (total <= 0) {
    return '#e2e8f0 0deg 360deg'
  }

  let cumulative = 0

  return data
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = (cumulative / total) * 360
      cumulative += item.value
      const end = (cumulative / total) * 360
      return `${item.color} ${start}deg ${end}deg`
    })
    .join(', ')
}

export default function TicketPieChartCard({ title, subtitle, data, total, totalLabel }) {
  const pieGradient = buildPieGradient(data, total)

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div
              className="mx-auto flex h-44 w-44 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${pieGradient})` }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{totalLabel}</p>
                <p className="text-xl font-bold text-slate-900">{total}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((item) => {
              const percent = total > 0 ? Math.round((item.value / total) * 100) : 0

              return (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {item.value} ({percent}%)
                    </p>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, backgroundColor: item.color }}
                    />
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

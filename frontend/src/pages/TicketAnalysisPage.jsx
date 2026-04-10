import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Flag,
  Layers3,
  Loader2,
  PieChart,
  RefreshCcw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ticketApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import TicketPieChartCard from '@/components/dashboard/TicketPieChartCard'

const PAGE_SIZE = 100

const statusOrder = ['OPEN', 'CLOSED', 'IN_PROGRESS', 'REJECTED']
const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const statusLabels = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  IN_PROGRESS: 'In Progress',
  REJECTED: 'Rejected',
}

const statusColors = {
  OPEN: '#0ea5e9',
  CLOSED: '#22c55e',
  IN_PROGRESS: '#f59e0b',
  REJECTED: '#ef4444',
}

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

const priorityColors = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#8b5cf6',
  CRITICAL: '#dc2626',
}

const dateRangeLabels = {
  ALL: 'All Time',
  '7': 'Last 7 Days',
  '30': 'Last 30 Days',
}

async function fetchAllTickets() {
  const allTickets = []
  let page = 0

  // Keep loading pages until a page returns fewer items than the requested size.
  while (true) {
    const { data } = await ticketApi.getAll({ page, size: PAGE_SIZE })
    const batch = Array.isArray(data) ? data : []

    allTickets.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return allTickets
}

export default function TicketAnalysisPage() {
  const { isAdmin, user } = useAuth()
  const [dateRange, setDateRange] = useState('ALL')

  const {
    data: tickets = [],
    dataUpdatedAt,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['ticket-analysis', user?.id, user?.role],
    enabled: isAdmin,
    queryFn: fetchAllTickets,
  })

  const filteredTickets = useMemo(() => {
    if (dateRange === 'ALL') {
      return tickets
    }

    const days = Number(dateRange)
    const referenceTime = dataUpdatedAt || 0
    const threshold = referenceTime - days * 24 * 60 * 60 * 1000

    return tickets.filter((ticket) => {
      if (!ticket?.createdAt) return false
      const createdAtTime = new Date(ticket.createdAt).getTime()
      if (Number.isNaN(createdAtTime)) return false
      return createdAtTime >= threshold
    })
  }, [tickets, dateRange, dataUpdatedAt])

  const statusData = useMemo(() => {
    const counts = statusOrder.reduce((acc, status) => ({ ...acc, [status]: 0 }), {})

    filteredTickets.forEach((ticket) => {
      const normalizedStatus = ticket.status === 'RESOLVED' ? 'CLOSED' : ticket.status

      if (counts[normalizedStatus] !== undefined) {
        counts[normalizedStatus] += 1
      }
    })

    return statusOrder.map((status) => ({
      key: status,
      label: statusLabels[status],
      value: counts[status],
      color: statusColors[status],
    }))
  }, [filteredTickets])

  const priorityData = useMemo(() => {
    const counts = priorityOrder.reduce((acc, priority) => ({ ...acc, [priority]: 0 }), {})

    filteredTickets.forEach((ticket) => {
      if (counts[ticket.priority] !== undefined) {
        counts[ticket.priority] += 1
      }
    })

    return priorityOrder.map((priority) => ({
      key: priority,
      label: priorityLabels[priority],
      value: counts[priority],
      color: priorityColors[priority],
    }))
  }, [filteredTickets])

  const trackedStatusTotal = statusData.reduce((sum, item) => sum + item.value, 0)
  const trackedPriorityTotal = priorityData.reduce((sum, item) => sum + item.value, 0)
  const totalTickets = filteredTickets.length
  const hasNoData = !isLoading && !isError && totalTickets === 0

  const summaryCards = [
    {
      key: 'total',
      title: 'Total Tickets',
      value: isLoading ? '...' : totalTickets,
      description: `Filtered by ${dateRangeLabels[dateRange]}`,
      icon: Layers3,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      indicator: '#6366f1',
    },
    {
      key: 'status',
      title: 'Status Tickets',
      value: isLoading ? '...' : trackedStatusTotal,
      description: 'OPEN, CLOSED, IN_PROGRESS, REJECTED',
      icon: Activity,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-100',
      indicator: '#0ea5e9',
    },
    {
      key: 'priority',
      title: 'Priority Tickets',
      value: isLoading ? '...' : trackedPriorityTotal,
      description: 'LOW, MEDIUM, HIGH, CRITICAL',
      icon: Flag,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      indicator: '#22c55e',
    },
  ]

  if (!isAdmin) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
        <CardContent className="flex items-center gap-3 p-6 text-rose-900">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">You are not authorized to view Ticket Analysis.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Administration
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Ticket Analysis</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Monitor ticket distributions with a clean, interactive analytics view.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Date Range</p>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white shadow-sm">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <Card
            key={card.key}
            className="group relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${card.indicator} 0%, transparent 100%)` }}
            />
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{card.title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{card.description}</p>
                </div>

                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-black/5', card.iconBg)}>
                  <card.icon className={cn('h-5 w-5', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {isError ? (
        <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-center gap-3 p-6 text-rose-900">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Unable to load ticket analysis data.</p>
          </CardContent>
        </Card>
      ) : hasNoData ? (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No Data Available</h3>
            <p className="max-w-md text-sm font-medium text-slate-500">
              No tickets are available for {dateRangeLabels[dateRange]}. Try another date range or refresh.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            <PieChart className="h-4 w-4 text-indigo-500" />
            Distribution Overview
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TicketPieChartCard
              title="Ticket Status Analysis"
              subtitle="OPEN, CLOSED, IN_PROGRESS, REJECTED"
              data={statusData}
              total={trackedStatusTotal}
              totalLabel="Statuses"
              icon={BarChart3}
            />

            <TicketPieChartCard
              title="Ticket Priority Analysis"
              subtitle="LOW, MEDIUM, HIGH, CRITICAL"
              data={priorityData}
              total={trackedPriorityTotal}
              totalLabel="Priorities"
              icon={Flag}
            />
          </div>
        </section>
      )}
    </div>
  )
}

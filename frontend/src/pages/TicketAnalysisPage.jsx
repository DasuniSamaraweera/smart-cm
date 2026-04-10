import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Flag, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ticketApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/card'
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
  HIGH: '#fb923c',
  CRITICAL: '#dc2626',
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

  const {
    data: tickets = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['ticket-analysis', user?.id, user?.role],
    enabled: isAdmin,
    queryFn: fetchAllTickets,
  })

  const statusData = useMemo(() => {
    const counts = statusOrder.reduce((acc, status) => ({ ...acc, [status]: 0 }), {})

    tickets.forEach((ticket) => {
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
  }, [tickets])

  const priorityData = useMemo(() => {
    const counts = priorityOrder.reduce((acc, priority) => ({ ...acc, [priority]: 0 }), {})

    tickets.forEach((ticket) => {
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
  }, [tickets])

  const trackedStatusTotal = statusData.reduce((sum, item) => sum + item.value, 0)
  const trackedPriorityTotal = priorityData.reduce((sum, item) => sum + item.value, 0)

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
    <div className="space-y-6 pb-2">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Ticket Analysis</h1>
        <p className="mt-1 text-sm text-slate-600">
          Analyze ticket distribution by status and priority.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{tickets.length}</p>
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Total Tickets</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 ring-1 ring-cyan-200/60">
              <Loader2 className={`h-5 w-5 text-cyan-600 ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '...' : trackedStatusTotal}</p>
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Status Tickets</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200/60">
              <Flag className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '...' : trackedPriorityTotal}</p>
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Priority Tickets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isError ? (
        <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-center gap-3 p-6 text-rose-900">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Unable to load ticket analysis data.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <TicketPieChartCard
            title="Ticket Status Analysis"
            subtitle="OPEN, CLOSED, IN_PROGRESS, REJECTED"
            data={statusData}
            total={trackedStatusTotal}
            totalLabel="Statuses"
          />

          <TicketPieChartCard
            title="Ticket Priority Analysis"
            subtitle="LOW, MEDIUM, HIGH, CRITICAL"
            data={priorityData}
            total={trackedPriorityTotal}
            totalLabel="Priorities"
          />
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Flag, Loader2, PieChart, Wrench } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ticketApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/card'
import TicketPieChartCard from '@/components/dashboard/TicketPieChartCard'

const PAGE_SIZE = 100

const statusOrder = ['CLOSED', 'IN_PROGRESS', 'RESOLVED']
const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const statusLabels = {
  CLOSED: 'Closed',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

const statusColors = {
  CLOSED: '#22c55e',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#0ea5e9',
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

async function fetchTechnicianTickets() {
  const allTickets = []
  let page = 0

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

export default function TechnicianTicketAnalysisPage() {
  const { user } = useAuth()
  const isTechnician = user?.role === 'TECHNICIAN'
  const technicianId = user?.id

  const {
    data: tickets = [],
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ['technician-ticket-analysis', user?.id, user?.role],
    enabled: isTechnician,
    queryFn: fetchTechnicianTickets,
  })

  const assignedTickets = useMemo(() => {
    if (!technicianId) {
      return []
    }

    return tickets.filter((ticket) => {
      const assignedToId = ticket?.assignedTo?.id

      // If API already returns technician-only assigned tickets without assignedTo payload,
      // keep the record visible instead of falsely excluding it.
      if (assignedToId === null || assignedToId === undefined) {
        return true
      }

      return String(assignedToId) === String(technicianId)
    })
  }, [tickets, technicianId])

  const statusData = useMemo(() => {
    const counts = statusOrder.reduce((acc, status) => ({ ...acc, [status]: 0 }), {})

    assignedTickets.forEach((ticket) => {
      if (counts[ticket.status] !== undefined) {
        counts[ticket.status] += 1
      }
    })

    return statusOrder.map((status) => ({
      key: status,
      label: statusLabels[status],
      value: counts[status],
      color: statusColors[status],
    }))
  }, [assignedTickets])

  const priorityData = useMemo(() => {
    const counts = priorityOrder.reduce((acc, priority) => ({ ...acc, [priority]: 0 }), {})

    assignedTickets.forEach((ticket) => {
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
  }, [assignedTickets])

  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0)
  const priorityTotal = priorityData.reduce((sum, item) => sum + item.value, 0)
  const inProgressCount = statusData.find((item) => item.key === 'IN_PROGRESS')?.value || 0
  const resolvedCount = statusData.find((item) => item.key === 'RESOLVED')?.value || 0
  const hasNoData = !isLoading && !isError && assignedTickets.length === 0

  if (!isTechnician) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
        <CardContent className="flex items-center gap-3 p-6 text-rose-900">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">You are not authorized to view Technician Ticket Analysis.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
          Technician Workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Ticket Analysis</h1>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Distribution of tickets currently assigned to you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg xl:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Total Assigned Tickets</p>
                <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '...' : assignedTickets.length}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-black/5">
                <Wrench className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">In Progress</p>
                <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '...' : inProgressCount}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-black/5">
                <Loader2 className={isFetching ? 'h-5 w-5 animate-spin text-amber-600' : 'h-5 w-5 text-amber-600'} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Resolved</p>
                <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '...' : resolvedCount}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 ring-1 ring-black/5">
                <BarChart3 className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {isError ? (
        <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-center gap-3 p-6 text-rose-900">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">Unable to load technician ticket analysis.</p>
          </CardContent>
        </Card>
      ) : hasNoData ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200">
              <PieChart className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Data Available</h3>
            <p className="max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
              No assigned tickets available for analysis right now.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index} className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-6">
                <div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <TicketPieChartCard
            title="Ticket Status Analysis"
            subtitle="CLOSED, IN_PROGRESS, RESOLVED"
            data={statusData}
            total={statusTotal}
            totalLabel="Statuses"
            icon={BarChart3}
          />

          <TicketPieChartCard
            title="Ticket Priority Analysis"
            subtitle="LOW, MEDIUM, HIGH, CRITICAL"
            data={priorityData}
            total={priorityTotal}
            totalLabel="Priorities"
            icon={Flag}
          />
        </div>
      )}
    </div>
  )
}

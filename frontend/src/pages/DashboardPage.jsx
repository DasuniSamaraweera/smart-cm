import { Building2, CalendarCheck, TicketCheck, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { bookingApi, resourceApi, ticketApi } from '@/api/endpoints'
import ResourceAvailabilityCalendar from '@/components/dashboard/ResourceAvailabilityCalendar'

const TICKET_PAGE_SIZE = 100

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  REJECTED: 'destructive',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isRegularUser = user?.role === 'USER'

  const fetchOpenTicketCount = async () => {
    let page = 0
    let total = 0

    while (true) {
      const params = isRegularUser
        ? { my: true, status: 'OPEN', page, size: TICKET_PAGE_SIZE }
        : { status: 'OPEN', page, size: TICKET_PAGE_SIZE }

      const { data } = await ticketApi.getAll(params)
      const batch = Array.isArray(data) ? data : []

      total += batch.length

      if (batch.length < TICKET_PAGE_SIZE) {
        break
      }

      page += 1
    }

    return total
  }

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll({}).then((res) => res.data),
  })

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['dashboard-tickets', user?.id, user?.role],
    enabled: !!user,
    queryFn: () =>
      ticketApi
        .getAll(isRegularUser ? { my: true, page: 0, size: 5 } : { page: 0, size: 5 })
        .then((res) => res.data),
  })

  const { data: openTickets = 0, isLoading: openTicketsLoading } = useQuery({
    queryKey: ['dashboard-open-ticket-count', user?.id, user?.role],
    enabled: !!user,
    queryFn: fetchOpenTicketCount,
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['dashboard-bookings-availability'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => bookingApi.getAll().then((res) => res.data),
  })

  const activeResources = resources.filter((r) => r.status === 'ACTIVE').length
  const totalResources = resources.length
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const resourceUsage = bookings.reduce((acc, booking) => {
    const resourceId = booking?.resource?.id
    const resourceName = booking?.resource?.name
    if (!resourceId || !resourceName) return acc

    const start = booking?.startTime ? new Date(booking.startTime) : null
    const end = booking?.endTime ? new Date(booking.endTime) : null
    const durationHours = start && end && end > start
      ? (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      : 0

    if (!acc[resourceId]) {
      acc[resourceId] = {
        resourceId,
        resourceName,
        bookingsCount: 0,
        totalHours: 0,
      }
    }

    acc[resourceId].bookingsCount += 1
    acc[resourceId].totalHours += durationHours

    return acc
  }, {})

  const topResources = Object.values(resourceUsage)
    .sort((a, b) => {
      if (b.bookingsCount !== a.bookingsCount) {
        return b.bookingsCount - a.bookingsCount
      }
      return b.totalHours - a.totalHours
    })
    .slice(0, 5)

  const peakUsageCount = topResources[0]?.bookingsCount || 1
  const pieColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']
  const totalUsageBookings = topResources.reduce((sum, item) => sum + item.bookingsCount, 0)
  const pieSegments = topResources.map((item, index) => ({
    ...item,
    color: pieColors[index % pieColors.length],
    ratio: totalUsageBookings > 0 ? item.bookingsCount / totalUsageBookings : 0,
  }))

  let accumulated = 0
  const pieGradient = pieSegments.length === 0
    ? '#e2e8f0 0 100%'
    : pieSegments
      .map((segment) => {
        const start = accumulated * 360
        accumulated += segment.ratio
        const end = accumulated * 360
        return `${segment.color} ${start}deg ${end}deg`
      })
      .join(', ')

  const stats = [
    {
      title: 'Total Resources',
      value: totalResources,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Active Resources',
      value: activeResources,
      icon: CalendarCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      title: 'Open Tickets',
      value: openTicketsLoading ? '...' : openTickets,
      icon: TicketCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Bookings',
      value: 0,
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
    },
  ]

  return (
    <div className="space-y-6 pb-2">
      {/* Welcome */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Operations Snapshot</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Here's an overview of the campus operations today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{stat.title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-black/5 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">No bookings yet. Create your first booking from the Bookings page.</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <p className="text-sm text-slate-600">Loading tickets...</p>
            ) : recentTickets.length === 0 ? (
              <p className="text-sm text-slate-600">No tickets yet. Report an issue from the Tickets page.</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="min-w-0">
                      <Link to={`/tickets/${ticket.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                        {ticket.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        #{ticket.id} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user?.role === 'ADMIN' && (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Usage Analytics (Top Resources)</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p className="text-sm text-slate-600">Loading usage analytics...</p>
            ) : topResources.length === 0 ? (
              <p className="text-sm text-slate-600">No booking usage data available yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${pieGradient})` }}
                  >
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Total</p>
                      <p className="text-xl font-bold text-slate-900">{totalUsageBookings}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {pieSegments.map((item) => (
                      <div key={`legend-${item.resourceId}`} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate text-slate-700">{item.resourceName}</span>
                        </div>
                        <span className="font-medium text-slate-800">{Math.round(item.ratio * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {topResources.map((item, index) => {
                    const usagePercent = Math.round((item.bookingsCount / peakUsageCount) * 100)

                    return (
                      <div key={item.resourceId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">
                            {index + 1}. {item.resourceName}
                          </p>
                          <p className="text-xs text-slate-600">
                            {item.bookingsCount} booking{item.bookingsCount > 1 ? 's' : ''} • {item.totalHours.toFixed(1)}h
                          </p>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {user?.role === 'ADMIN' && (
        <ResourceAvailabilityCalendar
          resources={resources}
          bookings={Array.isArray(bookings) ? bookings : []}
          isLoading={bookingsLoading}
        />
      )}
    </div>
  )
}

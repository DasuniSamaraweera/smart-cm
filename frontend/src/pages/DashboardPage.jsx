import { Building2, CalendarCheck, ChevronRight, TicketCheck, TrendingUp } from 'lucide-react'
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
  RESOLVED: 'success',
  CLOSED: 'outline',
  REJECTED: 'destructive',
}

const BOOKING_STATUS_STYLES = {
  PENDING:  'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED:'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
}

function BookingStatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BOOKING_STATUS_STYLES[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isRegularUser = user?.role === 'USER'
  const isTechnician = user?.role === 'TECHNICIAN'
  const ticketMetricStatus = isTechnician ? 'RESOLVED' : 'OPEN'
  const ticketMetricTitle = isTechnician ? 'Resolved Tickets' : 'Open Tickets'

  const fetchTicketMetricCount = async () => {
    let page = 0
    let total = 0
    while (true) {
      const params = isRegularUser
        ? { my: true, status: ticketMetricStatus, page, size: TICKET_PAGE_SIZE }
        : { status: ticketMetricStatus, page, size: TICKET_PAGE_SIZE }
      const { data } = await ticketApi.getAll(params)
      const batch = Array.isArray(data) ? data : []
      total += batch.length
      if (batch.length < TICKET_PAGE_SIZE) break
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

  const { data: ticketMetricCount = 0, isLoading: ticketMetricLoading } = useQuery({
    queryKey: ['dashboard-open-ticket-count', user?.id, user?.role],
    enabled: !!user,
    queryFn: fetchTicketMetricCount,
  })

  // Fetch bookings for ALL users, not just ADMIN
  const { data: bookingsData = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['dashboard-bookings', user?.id],
    enabled: !!user,
    queryFn: () => bookingApi.getAll().then((res) => res.data),
  })

  const bookings = Array.isArray(bookingsData) ? bookingsData : []

  const activeResources = resources.filter((r) => r.status === 'ACTIVE').length
  const totalResources = resources.length

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const stats = [
    { title: 'Total Resources',  value: totalResources,  icon: Building2,  color: 'text-blue-600',    bg: 'bg-blue-100' },
    { title: 'Active Resources', value: activeResources, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: ticketMetricTitle, value: ticketMetricLoading ? '...' : ticketMetricCount, icon: TicketCheck, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Bookings',         value: bookings.length, icon: TrendingUp,  color: 'text-violet-600',  bg: 'bg-violet-100' },
  ]

  return (
    <div className="space-y-6 pb-2">
      {/* Welcome */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Operations Snapshot</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Here's an overview of the campus operations today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{stat.title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-black/5 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading bookings...</p>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No bookings yet.{' '}
                <Link to="/bookings" className="underline hover:text-foreground">
                  Create your first booking
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{booking.resource?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(booking.startTime).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                        {' · '}
                        {booking.purpose}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading tickets...</p>
            ) : recentTickets.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No tickets yet. Report an issue from the Tickets page.</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-4 py-3 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400">
                        <TicketCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                        >
                          {ticket.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                          <span>{ticket.id}</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>{ticket.reporter?.name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user?.role === 'ADMIN' && (
        <ResourceAvailabilityCalendar
          resources={resources}
          bookings={bookings}
          isLoading={bookingsLoading}
        />
      )}
    </div>
  )
}

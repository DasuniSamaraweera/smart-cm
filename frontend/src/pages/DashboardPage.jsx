import { Building2, CalendarCheck, TicketCheck, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { bookingApi, resourceApi, ticketApi } from '@/api/endpoints'
import ResourceAvailabilityCalendar from '@/components/dashboard/ResourceAvailabilityCalendar'

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  REJECTED: 'destructive',
}

const BOOKING_STATUS_STYLES = {
  PENDING:   'bg-amber-100 text-amber-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function BookingStatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BOOKING_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isRegularUser = user?.role === 'USER'

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

  // Fixed: fetch bookings for ALL users, not just ADMIN
  const { data: bookingsData = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['dashboard-bookings', user?.id],
    enabled: !!user,
    queryFn: () => bookingApi.getAll().then((res) => res.data),
  })

  const bookings = Array.isArray(bookingsData) ? bookingsData : []

  const activeResources = resources.filter((r) => r.status === 'ACTIVE').length
  const totalResources = resources.length
  const openTickets = tickets.filter((ticket) => ticket.status === 'OPEN').length

  // Get 5 most recent bookings
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

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
      value: openTickets,
      icon: TicketCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Bookings',
      value: bookings.length,
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of the campus operations today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Recent Bookings - now fully connected */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p className="text-sm text-muted-foreground">Loading bookings...</p>
            ) : recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings yet.{' '}
                <Link to="/bookings" className="underline hover:text-foreground">
                  Create your first booking
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {booking.resource?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            ) : recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tickets yet. Report an issue from the Tickets page.
              </p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        #{ticket.id} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant[ticket.status] || 'secondary'}>
                      {ticket.status}
                    </Badge>
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

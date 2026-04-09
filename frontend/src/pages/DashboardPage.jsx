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

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['dashboard-bookings-availability'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => bookingApi.getAll().then((res) => res.data),
  })

  const activeResources = resources.filter((r) => r.status === 'ACTIVE').length
  const totalResources = resources.length
  const openTickets = tickets.filter((ticket) => ticket.status === 'OPEN').length
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
        <ResourceAvailabilityCalendar
          resources={resources}
          bookings={Array.isArray(bookings) ? bookings : []}
          isLoading={bookingsLoading}
        />
      )}
    </div>
  )
}

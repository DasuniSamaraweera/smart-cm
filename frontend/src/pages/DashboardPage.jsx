import { Building2, CalendarCheck, TicketCheck, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { resourceApi } from '@/api/endpoints'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll({}).then((res) => res.data),
  })

  const activeResources = resources.filter((r) => r.status === 'ACTIVE').length
  const totalResources = resources.length

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
      value: 0,
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

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No bookings yet. Create your first booking from the Bookings page.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No tickets yet. Report an issue from the Tickets page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

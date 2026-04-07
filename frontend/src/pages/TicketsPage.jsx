import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle, TicketCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ticketApi } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  REJECTED: 'destructive',
}

export default function TicketsPage() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const isRegularUser = user?.role === 'USER'
  const isTechnician = user?.role === 'TECHNICIAN'

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.id, user?.role],
    enabled: !!user,
    queryFn: () => ticketApi.getAll(isRegularUser ? { my: true } : {}).then((res) => res.data),
  })

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [tickets],
  )

  const title = isAdmin ? 'All Tickets' : isTechnician ? 'Assigned Tickets' : 'My Tickets'
  const subtitle = isAdmin
    ? 'Review all raised issues and assign them to technicians.'
    : isTechnician
      ? 'Track and work on tickets assigned to you.'
      : 'Track issues you have reported.'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {isRegularUser && (
          <Button onClick={() => navigate('/tickets/create')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedTickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <TicketCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No tickets yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRegularUser
                ? 'Create your first ticket to report an issue.'
                : 'No tickets are available right now.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer transition-shadow hover:shadow-sm"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1 text-base">{ticket.title}</CardTitle>
                  <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Priority: {ticket.priority}</p>
                  <p>Category: {ticket.category || 'N/A'}</p>
                  <p>Reporter: {ticket.reporter?.name || 'N/A'}</p>
                  {isAdmin && <p>Assigned: {ticket.assignedTo?.name || 'Unassigned'}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/tickets/${ticket.id}`)
                  }}
                >
                  {isAdmin ? 'View and Assign' : 'View Ticket'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

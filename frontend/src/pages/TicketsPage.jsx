import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle, TicketCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ticketApi } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  REJECTED: 'destructive',
}

const statusOptions = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED']
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function TicketsPage() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const isRegularUser = user?.role === 'USER'
  const isTechnician = user?.role === 'TECHNICIAN'
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.id, user?.role, statusFilter, priorityFilter],
    enabled: !!user,
    queryFn: () => {
      const params = {
        page: 0,
        size: 20,
      }

      if (isRegularUser) {
        params.my = true
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter
      }

      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter
      }

      return ticketApi.getAll(params).then((res) => res.data)
    },
  })

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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-52">
              <p className="mb-1 text-xs text-muted-foreground">Status</p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-52">
              <p className="mb-1 text-xs text-muted-foreground">Priority</p>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL')
                setPriorityFilter('ALL')
              }}
              disabled={statusFilter === 'ALL' && priorityFilter === 'ALL'}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

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
      ) : tickets.length === 0 ? (
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
          {tickets.map((ticket) => (
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

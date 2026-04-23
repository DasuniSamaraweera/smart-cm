import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, PlusCircle, Tag, TicketCheck, User, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ticketApi } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'

const statusVariant = {
  OPEN: 'default',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'closed',
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

  const title = isTechnician ? 'Assigned Tickets' : 'All Tickets'
  const subtitle = isAdmin
    ? 'View and manage all tickets in the system.'
    : isTechnician
      ? 'View tickets assigned to you.'
      : 'View all tickets you have reported.'

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100/70 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 dark:bg-gradient-to-r dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 px-6 py-7 shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-indigo-200/25 blur-2xl" />
        <div className="pointer-events-none absolute -right-14 top-0 h-36 w-36 rounded-full bg-sky-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Ticket Workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
          {isRegularUser && (
            <Button className="h-11 rounded-xl px-5 shadow-sm" onClick={() => navigate('/tickets/create')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
            </Button>
          )}
        </div>
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
              className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-gray-900/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <CardHeader className="space-y-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {ticket.title}
                  </CardTitle>
                  <Badge
                    variant={statusVariant[ticket.status] || 'secondary'}
                    className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
                  >
                    {ticket.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {ticket.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Reporter</p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{ticket.reporter?.name || 'N/A'}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Assignee</p>
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          <UserCheck className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{ticket.assignedTo?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Category</p>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <Tag className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="truncate">{ticket.category || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Priority</p>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="truncate">{ticket.priority}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant={isAdmin || isRegularUser || isTechnician ? 'default' : 'outline'}
                  size="sm"
                  className="w-full rounded-xl py-5 text-sm font-semibold tracking-wide transition-all duration-200 group-hover:shadow-md"
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

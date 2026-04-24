import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Bell, Check, Trash2, CheckCheck,
  CalendarCheck, CalendarX, Calendar,
  Wrench, UserCheck, MessageSquare, Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { notificationApi } from '@/api/endpoints'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  BOOKING_CREATED:       { icon: Calendar,      label: 'New Booking',       variant: 'default' },
  BOOKING_APPROVED:      { icon: CalendarCheck, label: 'Booking Approved',  variant: 'default' },
  BOOKING_REJECTED:      { icon: CalendarX,     label: 'Booking Rejected',  variant: 'destructive' },
  BOOKING_CANCELLED:     { icon: Calendar,      label: 'Booking Cancelled', variant: 'secondary' },
  TICKET_STATUS_CHANGED: { icon: Wrench,        label: 'Ticket Updated',    variant: 'default' },
  TICKET_ASSIGNED:       { icon: UserCheck,     label: 'Ticket Assigned',   variant: 'default' },
  TICKET_COMMENT_ADDED:  { icon: MessageSquare, label: 'New Comment',       variant: 'secondary' },
}

const FILTERS = [
  { key: 'ALL',     label: 'All' },
  { key: 'BOOKING', label: 'Bookings' },
  { key: 'TICKET',  label: 'Tickets' },
]

const BOOKING_TYPES = ['BOOKING_CREATED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED']
const TICKET_TYPES  = ['TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'TICKET_COMMENT_ADDED']

const getNavigationPath = (notification) => {
  const { type, referenceId } = notification
  if (BOOKING_TYPES.includes(type)) return '/bookings'
  if (TICKET_TYPES.includes(type))  return referenceId ? `/tickets/${referenceId}` : '/tickets'
  return null
}

function NotificationIcon({ type }) {
  const config = TYPE_CONFIG[type]
  const Icon = config?.icon ?? Bell
  return <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3 w-full">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isTechnician = user?.role === 'TECHNICIAN'
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('notificationPreferences')
    if (stored) return JSON.parse(stored)
    // Default: all categories enabled
    return {
      BOOKING_CREATED: true,
      BOOKING_APPROVED: true,
      BOOKING_REJECTED: true,
      BOOKING_CANCELLED: true,
      TICKET_STATUS_CHANGED: true,
      TICKET_ASSIGNED: true,
      TICKET_COMMENT_ADDED: true,
    }
  })

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
  }, [preferences])

  const togglePreference = (type) => {
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(res => res.data),
    refetchInterval: 3000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationApi.getUnreadCount().then(res => res.data),
    refetchInterval: 2000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('Marked as read')
    },
    onError: (error) => {
      toast.error('Failed to mark as read: ' + (error.response?.data?.message || error.message))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('Notification deleted')
    },
    onError: (error) => {
      toast.error('Failed to delete notification: ' + (error.response?.data?.message || error.message))
    },
  })

  // ✅ CHANGED — uses filteredNotifications instead of notifications
  const markAllReadMutation = useMutation({
    mutationFn: () => {
      const unread = filteredNotifications.filter(n => !n.read)
      return Promise.all(unread.map(n => notificationApi.markAsRead(n.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('All notifications marked as read')
    },
    onError: (error) => {
      toast.error('Failed to mark all as read: ' + (error.response?.data?.message || error.message))
    },
  })

  const handleCardClick = (n) => {
    if (!n.read) markAsReadMutation.mutate(n.id)
    const path = getNavigationPath(n)
    if (path) navigate(path)
  }

  const filteredNotifications = notifications.filter(n => {
    // Skip preferences filter for technicians
    if (!isTechnician && !preferences[n.type]) return false
    // Apply search filter
    const matchesSearch = n.message?.toLowerCase().includes(search.toLowerCase())
    // Then apply filter tabs
    if (activeFilter === 'BOOKING') {
      return BOOKING_TYPES.includes(n.type) && matchesSearch
    }
    if (activeFilter === 'TICKET') {
      return TICKET_TYPES.includes(n.type) && matchesSearch
    }
    return matchesSearch
  })

  const unreadCount = unreadData?.count ?? 0
  const hasUnread = filteredNotifications.some(n => !n.read) 

  return (
    <div className="space-y-6">
      {/* ── Hero header (matches UserManagement) ── */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-md">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                Alerts
              </p>
              <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Stay informed about updates and alerts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(filter => {
          let unreadCount = 0
          if (filter.key === 'ALL') {
            unreadCount = filteredNotifications.filter(n => !n.read).length
          } else if (filter.key === 'BOOKING') {
            unreadCount = filteredNotifications.filter(n => BOOKING_TYPES.includes(n.type) && !n.read).length
          } else if (filter.key === 'TICKET') {
            unreadCount = filteredNotifications.filter(n => TICKET_TYPES.includes(n.type) && !n.read).length
          }
          return (
            <Button
              key={filter.key}
              size="sm"
              variant={activeFilter === filter.key ? 'default' : 'outline'}
              onClick={() => setActiveFilter(filter.key)}
              className="rounded-xl text-xs"
            >
              {filter.label}
              <Badge
                className="ml-2 text-xs"
                variant={activeFilter === filter.key ? 'secondary' : 'outline'}
              >
                {unreadCount}
              </Badge>
            </Button>
          )
        })}
        {!isTechnician && (
          <Button
            variant={showPreferences ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
            className="ml-auto rounded-xl text-xs"
          >
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        )}
      </div>

      {/* Preferences Section */}
      {!isTechnician && showPreferences && (
        <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 shadow-sm">
          <CardHeader className="border-b border-indigo-100 pb-3">
            <CardTitle className="text-base text-slate-900">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <label className="text-sm font-medium cursor-pointer text-slate-700">{config.label}</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences[type]}
                        onChange={() => togglePreference(type)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Notifications card ── */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Bell className="h-4 w-4 text-indigo-500" />
            All Notifications
            <span className="text-sm font-normal text-slate-400">
              ({filteredNotifications.length} of {notifications.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 mb-4">
                <Bell className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No notifications</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {activeFilter === 'ALL' ? "You're all caught up!" : `No ${activeFilter.toLowerCase()} notifications.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((n) => {
                const config = TYPE_CONFIG[n.type]
                const path = getNavigationPath(n)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group flex items-center justify-between px-6 py-4 transition-colors',
                      !n.read ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50/80',
                      path && 'cursor-pointer'
                    )}
                    onClick={() => handleCardClick(n)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <NotificationIcon type={n.type} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={config?.variant ?? 'outline'} className="text-xs">
                            {config?.label ?? n.type}
                          </Badge>
                          {!n.read && (
                            <Badge className="bg-indigo-600 text-white text-xs">Unread</Badge>
                          )}
                          {path && (
                            <Badge variant="outline" className="text-indigo-600 text-xs">
                              Click to view →
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4 shrink-0" onClick={e => e.stopPropagation()}>
                      {!n.read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsReadMutation.mutate(n.id)}
                          disabled={markAsReadMutation.isPending}
                          className="rounded-lg"
                        >
                          <Check className="h-4 w-4 mr-1" /> Mark Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(n.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
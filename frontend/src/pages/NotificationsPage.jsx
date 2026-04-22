import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Bell, Check, Trash2, CheckCheck,
  CalendarCheck, CalendarX, Calendar,
  Wrench, UserCheck, MessageSquare, Settings
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { notificationApi } from '@/api/endpoints'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

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
    // Then apply filter tabs
    if (activeFilter === 'BOOKING') return BOOKING_TYPES.includes(n.type)
    if (activeFilter === 'TICKET')  return TICKET_TYPES.includes(n.type)
    return true
  })

  const unreadCount = unreadData?.count ?? 0
  const hasUnread = filteredNotifications.some(n => !n.read) 

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay informed about updates and alerts.</p>
        </div>
        {/* ✅ CHANGED — only shows if filtered view has unread */}
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTERS.map(filter => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
            <Badge
              className="ml-2 text-xs"
              variant={activeFilter === filter.key ? 'secondary' : 'outline'}
            >
              {filter.key === 'ALL'     && notifications.length}
              {filter.key === 'BOOKING' && notifications.filter(n => BOOKING_TYPES.includes(n.type)).length}
              {filter.key === 'TICKET'  && notifications.filter(n => TICKET_TYPES.includes(n.type)).length}
            </Badge>
          </Button>
        ))}
        {!isTechnician && (
          <Button
            variant={showPreferences ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
            className="ml-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        )}
      </div>

      {/* Preferences Section */}
      {!isTechnician && showPreferences && (
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-sm mb-4">Notification Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <label className="text-sm font-medium cursor-pointer">{config.label}</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences[type]}
                        onChange={() => togglePreference(type)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Content */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFilter === 'ALL' ? "You're all caught up!" : `No ${activeFilter.toLowerCase()} notifications.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const config = TYPE_CONFIG[n.type]
            const path = getNavigationPath(n)
            return (
              <Card
                key={n.id}
                className={`
                  ${!n.read ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30' : ''}
                  ${path ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
                `}
                onClick={() => handleCardClick(n)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={config?.variant ?? 'outline'}>
                          {config?.label ?? n.type}
                        </Badge>
                        {!n.read && (
                          <Badge className="bg-blue-500 text-white text-xs">Unread</Badge>
                        )}
                        {path && (
                          <Badge variant="outline" className="text-blue-600 text-xs">
                            Click to view →
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
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
                      >
                        <Check className="h-4 w-4 mr-1" /> Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(n.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
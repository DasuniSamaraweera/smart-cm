import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Check, Trash2, CheckCheck,
  CalendarCheck, CalendarX, Calendar,
  Wrench, UserCheck, MessageSquare
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { notificationApi } from '@/api/endpoints'
import { toast } from 'sonner'

const TYPE_CONFIG = {
  BOOKING_APPROVED:      { icon: CalendarCheck, label: 'Booking Approved',  variant: 'default' },
  BOOKING_REJECTED:      { icon: CalendarX,     label: 'Booking Rejected',  variant: 'destructive' },
  BOOKING_CANCELLED:     { icon: Calendar,       label: 'Booking Cancelled', variant: 'secondary' },
  TICKET_STATUS_CHANGED: { icon: Wrench,         label: 'Ticket Updated',    variant: 'default' },
  TICKET_ASSIGNED:       { icon: UserCheck,      label: 'Ticket Assigned',   variant: 'default' },
  TICKET_COMMENT_ADDED:  { icon: MessageSquare,  label: 'New Comment',       variant: 'secondary' },
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

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(res => res.data),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationApi.getUnreadCount().then(res => res.data),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('Marked as read')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('Notification deleted')
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      const unread = notifications.filter(n => !n.read)
      return Promise.all(unread.map(n => notificationApi.markAsRead(n.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('All notifications marked as read')
    },
  })

  const unreadCount = unreadData?.count ?? 0
  const hasUnread = unreadCount > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {hasUnread && (
              <Badge className="bg-blue-500 text-white">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay informed about updates and alerts.</p>
        </div>
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

      <Separator />

      {/* Content */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type]
            return (
              <Card
                key={n.id}
                className={!n.read
                  ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                  : ''
                }
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 shrink-0">
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
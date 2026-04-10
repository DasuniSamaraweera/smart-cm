import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  TicketCheck,
  Bell,
  Settings,
  PieChart,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { notificationApi } from '@/api/endpoints'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resources', icon: Building2, label: 'Resources' },
  { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/tickets', icon: TicketCheck, label: 'Tickets' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const adminItems = [
  { to: '/admin/users', icon: Settings, label: 'User Management' },
  { to: '/admin/ticket-analysis', icon: PieChart, label: 'Ticket Analysis' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { isAdmin } = useAuth()
  
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationApi.getUnreadCount().then(res => res.data),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
  })

  const unreadCount = unreadData?.count ?? 0
  const hasUnread = unreadCount > 0

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-indigo-100 bg-gradient-to-b from-indigo-600 via-indigo-600 to-violet-600 text-indigo-50 shadow-xl transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/15 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm backdrop-blur-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-white">Smart Campus</span>
              <span className="text-[10px] leading-tight text-indigo-100/80">Operations Hub</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-100/75">
            Menu
          </p>
        )}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-indigo-100/85 hover:bg-white/15 hover:text-white',
                    collapsed && 'justify-center px-2 relative'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-indigo-700')} />
                  {item.to === '/notifications' && hasUnread && collapsed && (
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></div>
                  )}
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 gap-2">
                      <span>{item.label}</span>
                      {item.to === '/notifications' && hasUnread && (
                        <Badge className="bg-red-500 text-white text-xs">{unreadCount}</Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <>
            <Separator className="my-4 bg-white/15" />
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-100/75">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {({ isActive }) => (
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-indigo-100/85 hover:bg-white/15 hover:text-white',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-indigo-700')} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/15 p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white',
            collapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

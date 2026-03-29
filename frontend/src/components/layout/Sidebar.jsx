import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  TicketCheck,
  Bell,
  Settings,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resources', icon: Building2, label: 'Resources' },
  { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/tickets', icon: TicketCheck, label: 'Tickets' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const adminItems = [
  { to: '/admin/users', icon: Settings, label: 'User Management' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { isAdmin } = useAuth()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight">Smart Campus</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Operations Hub</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {!collapsed && (
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
        )}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {isAdmin && (
          <>
            <Separator className="my-4" />
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {({ isActive }) => (
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
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
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn('w-full', collapsed ? 'justify-center' : 'justify-start')}
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

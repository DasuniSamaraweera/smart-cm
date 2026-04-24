import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import {
  Shield, ShieldCheck, Users, Mail,
  Pencil, Trash2, MoreHorizontal, Loader2,
  Search, UserCog, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const roleBadge = {
  ADMIN:      { label: 'Admin',          color: 'bg-red-100 text-red-700 border-red-200' },
  USER:       { label: 'User',           color: 'bg-slate-100 text-slate-700 border-slate-200' },
  TECHNICIAN: { label: 'Technician',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  LECTURER:   { label: 'Academic Staff', color: 'bg-violet-100 text-violet-700 border-violet-200' },
}

const buildStats = (users) => [
  {
    label: 'Total Users',
    value: users.length,
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    indicator: '#6366f1',
  },
  {
    label: 'Admins',
    value: users.filter(u => u.role === 'ADMIN').length,
    icon: ShieldCheck,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    indicator: '#ef4444',
  },
  {
    label: 'Regular Users',
    value: users.filter(u => u.role === 'USER').length,
    icon: Shield,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    indicator: '#22c55e',
  },
  {
    label: 'Technicians',
    value: users.filter(u => u.role === 'TECHNICIAN').length,
    icon: UserCog,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    indicator: '#f59e0b',
  },
  {
    label: 'Academic Staff',
    value: users.filter(u => u.role === 'LECTURER').length,
    icon: UserCog,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    indicator: '#8b5cf6',
  },
]

const ROLE_FILTERS = ['ALL', 'ADMIN', 'USER', 'TECHNICIAN', 'LECTURER']
const ROLE_FILTER_LABELS = {
  ALL: 'All',
  ADMIN: 'Admin',
  USER: 'User',
  TECHNICIAN: 'Technician',
  LECTURER: 'Academic Staff',
}

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [editDialog, setEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.getUsers().then(res => res.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
      setEditDialog(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  })

  const handleEdit = (user) => {
    setEditingUser(user)
    setEditForm({ name: user.name, email: user.email, role: user.role })
    setEditDialog(true)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({ id: editingUser.id, data: editForm })
  }

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) { toast.error("You can't delete your own account"); return }
    if (window.confirm(`Delete ${user.name}? This cannot be undone.`)) deleteMutation.mutate(user.id)
  }

  const handleRoleQuickChange = (userId, newRole) => {
    if (userId === currentUser?.id) { toast.error("You can't change your own role"); return }
    updateMutation.mutate({ id: userId, data: { role: newRole } })
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
                          u.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = buildStats(users)

  if (!isAdmin) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-rose-50/50">
        <CardContent className="flex items-center gap-3 p-6 text-rose-900">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">You are not authorized to view User Management.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-md">
              <UserCog className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                Administration
              </p>
              <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">
                View registered users, manage roles and permissions.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(card => (
          <Card
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${card.indicator} 0%, transparent 100%)` }}
            />
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {isLoading ? '...' : card.value}
                  </p>
                </div>
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-black/5', card.iconBg)}>
                  <card.icon className={cn('h-5 w-5', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map(role => (
          <Button
            key={role}
            size="sm"
            variant={roleFilter === role ? 'default' : 'outline'}
            onClick={() => setRoleFilter(role)}
            className="rounded-xl text-xs"
          >
            {ROLE_FILTER_LABELS[role]}
          </Button>
        ))}
      </div>

      {/* User list */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-900">
            <Users className="h-4 w-4 text-indigo-500" />
            All Users
            <span className="text-sm font-normal text-slate-400">
              ({filteredUsers.length} of {users.length})
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
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 mb-4">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No users found</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Try adjusting your search or filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const badge = roleBadge[user.role] || roleBadge.USER
                const isSelf = user.id === currentUser?.id
                return (
                  <div
                    key={user.id}
                    className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-sm">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-200 text-indigo-600">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isSelf ? (
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <Select value={user.role} onValueChange={val => handleRoleQuickChange(user.id, val)}>
                          <SelectTrigger className="h-8 w-[148px] rounded-xl border-slate-200 bg-slate-50 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="TECHNICIAN">Technician</SelectItem>
                            <SelectItem value="LECTURER">Academic Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!isSelf && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white">
          <DialogHeader>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">User Profile</p>
            <DialogTitle className="text-slate-900">Edit User</DialogTitle>
            <DialogDescription className="text-slate-600">Update user details and role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <div>
              <Label htmlFor="edit-name" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Role</Label>
              <Select value={editForm.role} onValueChange={val => setEditForm(f => ({ ...f, role: val }))}>
                <SelectTrigger className="mt-1.5 rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                  <SelectItem value="LECTURER">Academic Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl border-slate-300" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
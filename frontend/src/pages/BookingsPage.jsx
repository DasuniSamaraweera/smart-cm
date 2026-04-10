import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingApi, resourceApi } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Status badge colours ────────────────────────────────────────────────────
const STATUS_STYLES = {
  PENDING:   'bg-amber-100 text-amber-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtTime(t) {
  if (!t) return null
  return t.substring(0, 5)
}

function getDuration(startTime, endTime) {
  if (!startTime || !endTime) return null
  const diffMs = new Date(endTime) - new Date(startTime)
  const totalMins = Math.round(diffMs / 60000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-white shadow-sm border text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Admin Analytics Section ─────────────────────────────────────────────────
function BookingAnalytics({ bookings }) {
  const resourceCounts = bookings.reduce((acc, b) => {
    const name = b.resource?.name
    if (!name) return acc
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})

  const topResources = Object.entries(resourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maxResourceCount = topResources[0]?.[1] || 1

  const hourCounts = bookings.reduce((acc, b) => {
    if (!b.startTime) return acc
    const hour = new Date(b.startTime).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})

  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  const maxHourCount = peakHours[0]?.[1] || 1

  function fmtHour(h) {
    const hour = Number(h)
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  const rankColors = [
    'bg-yellow-100 text-yellow-700',
    'bg-slate-100 text-slate-600',
    'bg-orange-100 text-orange-600',
    'bg-muted text-muted-foreground',
    'bg-muted text-muted-foreground',
  ]

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No booking data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top Resources */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <span className="text-sm">🏆</span>
            </div>
            <div>
              <CardTitle className="text-base">Top Booked Resources</CardTitle>
              <p className="text-xs text-muted-foreground">Most requested facilities</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topResources.map(([name, count], index) => {
            const pct = Math.round((count / maxResourceCount) * 100)
            return (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${rankColors[index]}`}>
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {count} booking{count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-sm">🕐</span>
            </div>
            <div>
              <CardTitle className="text-base">Peak Booking Hours</CardTitle>
              <p className="text-xs text-muted-foreground">Busiest times of day</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {peakHours.map(([hour, count]) => {
            const pct = Math.round((count / maxHourCount) * 100)
            const isTopHour = count === maxHourCount
            return (
              <div key={hour} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isTopHour && <span className="text-xs">🔥</span>}
                    <span className="text-sm font-medium">{fmtHour(hour)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {count} booking{count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isTopHour
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        : 'bg-gradient-to-r from-blue-400 to-blue-300'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── New Booking Dialog ──────────────────────────────────────────────────────
function BookingFormDialog({ open, onClose, preselectedResourceId }) {
  const queryClient = useQueryClient()

  const [resourceId, setResourceId]      = useState(preselectedResourceId ?? '')
  const [startTime, setStartTime]        = useState('')
  const [endTime, setEndTime]            = useState('')
  const [purpose, setPurpose]            = useState('')
  const [expectedAttendees, setExpected] = useState('')

  useEffect(() => {
    if (open) {
      setResourceId(preselectedResourceId ?? '')
      setStartTime('')
      setEndTime('')
      setPurpose('')
      setExpected('')
    }
  }, [open, preselectedResourceId])

  const { data: resourcesData } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll({ status: 'ACTIVE' }).then(r => r.data),
  })

  const resources = resourcesData?.content ?? resourcesData ?? []
  const selectedResource = resources.find(r => String(r.id) === String(resourceId))

  const createMutation = useMutation({
    mutationFn: (data) => bookingApi.create(data).then(r => r.data),
    onSuccess: () => {
      toast.success('Booking request submitted – awaiting admin approval')
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create booking')
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!resourceId) return toast.error('Please select a resource')
    if (!startTime || !endTime) return toast.error('Please set start and end times')
    if (new Date(endTime) <= new Date(startTime)) return toast.error('End time must be after start time')
    if (!purpose.trim()) return toast.error('Please enter a purpose')

    createMutation.mutate({
      resourceId: Number(resourceId),
      startTime: startTime.slice(0, 19),
      endTime:   endTime.slice(0, 19),
      purpose,
      expectedAttendees: expectedAttendees ? Number(expectedAttendees) : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Resource</Label>
            <Select value={String(resourceId)} onValueChange={setResourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a resource…" />
              </SelectTrigger>
              <SelectContent>
                {resources.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} — {r.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedResource?.availabilityStart && (
              <p className="text-xs text-muted-foreground">
                Available {fmtTime(selectedResource.availabilityStart)} – {fmtTime(selectedResource.availabilityEnd)}
                {selectedResource.capacity ? ` · Capacity: ${selectedResource.capacity}` : ''}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                min={startTime || new Date().toISOString().slice(0, 16)}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Purpose</Label>
            <Textarea
              placeholder="Describe the purpose of this booking…"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>Expected attendees <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="number"
              min={1}
              max={selectedResource?.capacity ?? 9999}
              placeholder="e.g. 30"
              value={expectedAttendees}
              onChange={e => setExpected(e.target.value)}
            />
            {selectedResource?.capacity && (
              <p className="text-xs text-muted-foreground">Max capacity: {selectedResource.capacity}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Admin: Review Dialog ────────────────────────────────────────────────────
function ReviewDialog({ booking, onClose }) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const reviewMutation = useMutation({
    mutationFn: ({ status, reason }) =>
      bookingApi.updateStatus(booking.id, { status, reason }).then(r => r.data),
    onSuccess: (_, vars) => {
      toast.success(`Booking ${vars.status.toLowerCase()} successfully`)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? 'Action failed')
    },
  })

  function handleReview(status) {
    if (status === 'REJECTED' && !reason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    reviewMutation.mutate({ status, reason })
  }

  if (!booking) return null

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Resource</span>
            <span className="font-medium">{booking.resource?.name}</span>
            <span className="text-muted-foreground">Requested by</span>
            <span>{booking.user?.name}</span>
            <span className="text-muted-foreground">Start</span>
            <span>{fmtDateTime(booking.startTime)}</span>
            <span className="text-muted-foreground">End</span>
            <span>{fmtDateTime(booking.endTime)}</span>
            <span className="text-muted-foreground">Duration</span>
            <span>{getDuration(booking.startTime, booking.endTime)}</span>
            <span className="text-muted-foreground">Purpose</span>
            <span>{booking.purpose}</span>
            {booking.expectedAttendees && (
              <>
                <span className="text-muted-foreground">Attendees</span>
                <span>{booking.expectedAttendees}</span>
              </>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <Label>Reason <span className="text-muted-foreground">(required for rejection)</span></Label>
            <Textarea
              placeholder="Add a reason or note…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="destructive" disabled={reviewMutation.isPending} onClick={() => handleReview('REJECTED')}>
              Reject
            </Button>
            <Button disabled={reviewMutation.isPending} onClick={() => handleReview('APPROVED')}>
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, isAdmin, onReview, onCancel }) {
  const canCancel = ['PENDING', 'APPROVED'].includes(booking.status)
  const duration = getDuration(booking.startTime, booking.endTime)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{booking.resource?.name}</span>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{booking.resource?.location}</p>

            <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
              <p>
                <span className="text-foreground">{fmtDateTime(booking.startTime)}</span>
                {' → '}
                <span className="text-foreground">{fmtDateTime(booking.endTime)}</span>
                {duration && (
                  <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-md">
                    {duration}
                  </span>
                )}
              </p>
              <p>Purpose: {booking.purpose}</p>
              {booking.expectedAttendees && <p>Attendees: {booking.expectedAttendees}</p>}
              {isAdmin && <p>Requested by: {booking.user?.name}</p>}
              {booking.adminReason && (
                <p className="text-amber-700 dark:text-amber-400">Note: {booking.adminReason}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {isAdmin && booking.status === 'PENDING' && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => onReview(booking)}
              >
                Review
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancel(booking)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const preselectedResourceId = searchParams.get('resourceId')

  const [showNewBooking, setShowNewBooking] = useState(!!preselectedResourceId)
  const [reviewTarget, setReviewTarget]     = useState(null)
  const [statusFilter, setStatusFilter]     = useState('ALL')
  const [search, setSearch]                 = useState('')
  const [activeTab, setActiveTab]           = useState('upcoming')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.getAll().then(r => r.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => bookingApi.delete(id),
    onSuccess: () => {
      toast.success('Booking cancelled')
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel booking')
    },
  })

  function handleCancel(booking) {
    if (!confirm(`Cancel booking for "${booking.resource?.name}"?`)) return
    cancelMutation.mutate(booking.id)
  }

  const now = new Date()
  const allBookings = Array.isArray(data) ? data : []

  const upcomingBookings = allBookings.filter(b => new Date(b.startTime) >= now)
  const pastBookings     = allBookings.filter(b => new Date(b.startTime) < now)
  const baseList         = activeTab === 'upcoming' ? upcomingBookings : pastBookings

  const filtered = baseList.filter(b => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
    const matchSearch = !search ||
      b.resource?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const pending  = allBookings.filter(b => b.status === 'PENDING').length
  const approved = allBookings.filter(b => b.status === 'APPROVED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Schedule and manage resource reservations
          </p>
        </div>
        <Button onClick={() => setShowNewBooking(true)}>+ New Booking</Button>
      </div>

      {/* Admin summary */}
      {isAdmin && (
        <div className="flex gap-3 flex-wrap">
          <div className="rounded-lg border px-4 py-2 text-sm">
            <span className="text-muted-foreground">Pending review </span>
            <span className="font-semibold text-amber-600">{pending}</span>
          </div>
          <div className="rounded-lg border px-4 py-2 text-sm">
            <span className="text-muted-foreground">Active bookings </span>
            <span className="font-semibold text-green-600">{approved}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        <TabButton
          label="Upcoming"
          count={upcomingBookings.length}
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
        />
        <TabButton
          label="Past"
          count={pastBookings.length}
          active={activeTab === 'past'}
          onClick={() => setActiveTab('past')}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by resource, purpose or user…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading bookings…</div>
      )}

      {isError && (
        <div className="text-center py-16 text-red-500 text-sm">Failed to load bookings.</div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          </p>
          {activeTab === 'upcoming' && (
            <Button className="mt-4" onClick={() => setShowNewBooking(true)}>
              Make your first booking
            </Button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isAdmin={isAdmin}
              onReview={setReviewTarget}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Admin Analytics — only visible to admins */}
      {isAdmin && !isLoading && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Booking Analytics</h2>
          <BookingAnalytics bookings={allBookings} />
        </div>
      )}

      {/* Dialogs */}
      <BookingFormDialog
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        preselectedResourceId={preselectedResourceId}
      />

      <ReviewDialog
        booking={reviewTarget}
        onClose={() => setReviewTarget(null)}
      />
    </div>
  )
}

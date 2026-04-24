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
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Clock3,
  CalendarDays,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Building2,
  AlertCircle,
} from 'lucide-react'

// ─── Status badge colours (enhanced) ─────────────────────────────────────────
const STATUS_STYLES = {
  PENDING:   'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED:  'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
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

// ─── Enhanced Tab Button ─────────────────────────────────────────────────────
function TabButton({ label, count, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Admin Analytics Section (enhanced) ──────────────────────────────────────
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

  if (bookings.length === 0) {
    return (
      <Card className="rounded-2xl border-slate-200 bg-slate-50/50">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-indigo-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">No booking data available yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Bookings will appear here once made.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top Resources */}
      <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Top Booked Resources</CardTitle>
              <p className="text-xs text-muted-foreground">Most requested facilities</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topResources.map(([name, count], index) => {
            const pct = Math.round((count / maxResourceCount) * 100)
            const colors = ['from-amber-500 to-orange-500', 'from-slate-500 to-slate-600', 'from-indigo-500 to-purple-500', 'from-sky-500 to-blue-500', 'from-emerald-500 to-teal-500']
            return (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-6">#{index + 1}</span>
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">
                    {count} booking{count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Peak Booking Hours</CardTitle>
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
                    {isTopHour && <span className="text-sm">🔥</span>}
                    <span className="text-sm font-medium">{fmtHour(hour)}</span>
                  </div>
                  <span className="text-xs font-semibold text-sky-600">
                    {count} booking{count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTopHour
                        ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                        : 'bg-gradient-to-r from-sky-400 to-sky-300'
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

// ─── New Booking Dialog (Cleaner Layout, Fixed Equipment Display) ────────────
function BookingFormDialog({ open, onClose, preselectedResourceId }) {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const resourceNameFromUrl = searchParams.get('resourceName')
  
  const [resourceId, setResourceId] = useState(preselectedResourceId ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [purpose, setPurpose] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    if (open) {
      setResourceId(preselectedResourceId ?? '')
      setStartTime('')
      setEndTime('')
      setPurpose('')
      setQuantity('')
    }
  }, [open, preselectedResourceId])

  const { data: resourcesData } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll({ status: 'ACTIVE' }).then(r => r.data),
  })

  const resources = resourcesData?.content ?? resourcesData ?? []
  const selectedResource = resources.find(r => String(r.id) === String(resourceId))

  // ─── Dynamic field configuration based on resource type ────────────────────
const getQuantityFieldConfig = (resourceType) => {
  const configs = {
    // Venues / Facilities
    'LECTURE_HALL': {
      label: 'Expected attendees',
      placeholder: 'Number of people attending',
      min: 1,
      max: selectedResource?.capacity || 500,
      suffix: 'people'
    },
    'MEETING_ROOM': {
      label: 'Expected attendees',
      placeholder: 'Number of participants',
      min: 1,
      max: selectedResource?.capacity || 50,
      suffix: 'people'
    },
    'LAB': {
      label: 'Number of users',
      placeholder: 'How many students or researchers?',
      min: 1,
      max: selectedResource?.capacity || 100,
      suffix: 'users'
    },
    
    // Equipment
    'EQUIPMENT': {
      label: 'Number of units required',
      placeholder: 'How many units do you need?',
      min: 1,
      max: selectedResource?.capacity || 10,
      suffix: 'unit(s)'
    },
    'COMPUTER': {
      label: 'Number of computers required',
      placeholder: 'How many computers?',
      min: 1,
      max: selectedResource?.capacity || 30,
      suffix: 'computer(s)'
    },
    'SPEAKER': {
      label: 'Number of speakers required',
      placeholder: 'How many speakers?',
      min: 1,
      max: selectedResource?.capacity || 10,
      suffix: 'speaker(s)'
    },
    'PROJECTOR': {
      label: 'Number of projectors required',
      placeholder: 'How many projectors?',
      min: 1,
      max: selectedResource?.capacity || 5,
      suffix: 'projector(s)'
    },
    'CAMERA': {
      label: 'Number of cameras required',
      placeholder: 'How many cameras?',
      min: 1,
      max: selectedResource?.capacity || 10,
      suffix: 'camera(s)'
    },
    
    // Study Materials
    'STUDY_MATERIAL': {
      label: 'Number of items required',
      placeholder: 'How many copies/items do you need?',
      min: 1,
      max: selectedResource?.capacity || 50,
      suffix: 'item(s)'
    },
    'BOOK': {
      label: 'Number of copies required',
      placeholder: 'How many copies?',
      min: 1,
      max: selectedResource?.capacity || 50,
      suffix: 'copy/copies'
    },
    'JOURNAL': {
      label: 'Number of journals required',
      placeholder: 'How many journal issues?',
      min: 1,
      max: selectedResource?.capacity || 20,
      suffix: 'journal(s)'
    },
    'RESEARCH_PAPER': {
      label: 'Number of papers required',
      placeholder: 'How many research papers?',
      min: 1,
      max: selectedResource?.capacity || 20,
      suffix: 'paper(s)'
    },
    
    // Shared Utilities
    'SHARED_UTILITY': {
      label: 'Number of units required',
      placeholder: 'How many units?',
      min: 1,
      max: selectedResource?.capacity || 20,
      suffix: 'unit(s)'
    },
    
    // Multimedia
    'MULTIMEDIA': {
      label: 'Number of items required',
      placeholder: 'How many items?',
      min: 1,
      max: selectedResource?.capacity || 15,
      suffix: 'item(s)'
    },
  }
  
  return configs[resourceType] || {
    label: 'Quantity required',
    placeholder: 'Enter quantity',
    min: 1,
    max: 100,
    suffix: 'unit(s)'
  }
}

  const quantityConfig = selectedResource 
    ? getQuantityFieldConfig(selectedResource.type)
    : null
  
  const showQuantityField = selectedResource && quantityConfig !== null
  const isVenue = selectedResource && ['LECTURE_HALL', 'MEETING_ROOM', 'LAB'].includes(selectedResource.type)

  const availMin = selectedResource?.availabilityDate && selectedResource?.availabilityStart
    ? `${selectedResource.availabilityDate}T${selectedResource.availabilityStart}`
    : new Date().toISOString().slice(0, 16)

  const availMax = selectedResource?.availabilityDate && selectedResource?.availabilityEnd
    ? `${selectedResource.availabilityDate}T${selectedResource.availabilityEnd}`
    : undefined

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
    
    if (showQuantityField && !quantity) {
      return toast.error(`Please enter ${quantityConfig.label.toLowerCase()}`)
    }

    createMutation.mutate({
      resourceId: Number(resourceId),
      startTime: startTime.slice(0, 19),
      endTime: endTime.slice(0, 19),
      purpose,
      expectedAttendees: isVenue && quantity ? Number(quantity) : (isVenue ? null : Number(quantity)),
    })
  }

  function handleResourceChange(val) {
    setResourceId(val)
    setStartTime('')
    setEndTime('')
    setQuantity('')
  }

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            New Booking Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Resource selector */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Resource</Label>
            <Select value={String(resourceId)} onValueChange={handleResourceChange}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Select a resource..." />
              </SelectTrigger>
              <SelectContent>
                {resources.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} — {r.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource info box - Cleaner without emoji */}
          {selectedResource && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Availability</p>
              <div className="mt-1 space-y-0.5 text-xs text-slate-700">
                <p>{formatDisplayDate(selectedResource.availabilityDate)}</p>
                <p>{selectedResource.availabilityStart?.substring(0,5)} – {selectedResource.availabilityEnd?.substring(0,5)}</p>
                {selectedResource.capacity && (
                  <p className="text-slate-500">
                    {selectedResource.type === 'EQUIPMENT' 
                      ? `Available quantity: ${selectedResource.capacity} unit(s)`
                      : `Max capacity: ${selectedResource.capacity} people`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Time inputs - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Start time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                min={availMin}
                max={availMax}
                onChange={e => setStartTime(e.target.value)}
                className="rounded-xl h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">End time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                min={startTime || availMin}
                max={availMax}
                onChange={e => setEndTime(e.target.value)}
                className="rounded-xl h-10 text-sm"
              />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Purpose</Label>
            <Textarea
              placeholder="Describe the purpose of this booking..."
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={2}
              className="rounded-xl text-sm resize-none"
            />
          </div>

          {/* Dynamic Quantity Field */}
          {showQuantityField && quantityConfig && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                {quantityConfig.label} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={quantityConfig.min}
                max={quantityConfig.max}
                step="1"
                placeholder={quantityConfig.placeholder}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="rounded-xl h-10"
              />
              <p className="text-xs text-muted-foreground">
                Max: {quantityConfig.max} {quantityConfig.suffix}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-9">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending} 
              className="rounded-xl h-9 bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Admin: Review Dialog (enhanced) ─────────────────────────────────────────
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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Review Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm mt-2">
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resource</span>
              <span className="font-medium">{booking.resource?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested by</span>
              <span>{booking.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span>{getDuration(booking.startTime, booking.endTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purpose</span>
              <span className="truncate max-w-[200px]">{booking.purpose}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reason <span className="text-muted-foreground">(required for rejection)</span></Label>
            <Textarea placeholder="Add a reason or note…" value={reason}
              onChange={e => setReason(e.target.value)} rows={3} className="rounded-xl" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
            <Button variant="destructive" disabled={reviewMutation.isPending} 
              onClick={() => handleReview('REJECTED')} className="rounded-xl">
              Reject
            </Button>
            <Button disabled={reviewMutation.isPending} onClick={() => handleReview('APPROVED')}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Enhanced Booking Card (Better Visual Hierarchy) ────────────────────────
function BookingCard({ booking, isAdmin, onReview, onCancel }) {
  const canCancel = ['PENDING', 'APPROVED'].includes(booking.status)
  const duration = getDuration(booking.startTime, booking.endTime)

  // Safety check - if booking or resource is missing, don't crash
  if (!booking || !booking.resource) {
    return (
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Booking data unavailable</p>
        </CardContent>
      </Card>
    )
  }

  // ─── Determine resource type (case-insensitive) ──────────────────────────
  const getResourceTypeUpper = () => {
    return booking.resource?.type?.toUpperCase() || ''
  }

  const isEquipmentType = () => {
    const equipmentTypes = ['EQUIPMENT', 'COMPUTER', 'SPEAKER', 'PROJECTOR', 'CAMERA']
    return equipmentTypes.includes(getResourceTypeUpper())
  }

  const isStudyMaterialType = () => {
    const studyTypes = ['STUDY_MATERIAL', 'BOOK', 'JOURNAL', 'RESEARCH_PAPER']
    return studyTypes.includes(getResourceTypeUpper())
  }

  const isVenueType = () => {
    const venueTypes = ['LECTURE_HALL', 'MEETING_ROOM', 'LAB']
    return venueTypes.includes(getResourceTypeUpper())
  }

  // ─── Get capacity/availability text based on resource type ─────────────────
  const getCapacityDisplay = () => {
    const capacity = booking.resource?.capacity
    
    if (!capacity) return null
    
    if (isEquipmentType()) {
      return `Available: ${capacity} unit(s)`
    }
    
    if (isStudyMaterialType()) {
      return `Available: ${capacity} copy/copies`
    }
    
    if (isVenueType()) {
      return `Capacity: ${capacity} people`
    }
    
    return `Quantity: ${capacity}`
  }

  // ─── Get quantity label for the booking (what user requested) ──────────────
  const getQuantityRequestedLabel = () => {
    const quantity = booking.expectedAttendees
    if (!quantity) return null
    
    if (isVenueType()) {
      return `${quantity} ${quantity === 1 ? 'attendee' : 'attendees'}`
    }
    
    if (isEquipmentType()) {
      return `${quantity} ${quantity === 1 ? 'unit' : 'units'}`
    }
    
    if (isStudyMaterialType()) {
      return `${quantity} ${quantity === 1 ? 'item' : 'items'}`
    }
    
    return `${quantity} requested`
  }

  return (
    <Card className="group rounded-2xl border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Header - Resource name prominently displayed */}
        <div className="bg-gradient-to-r from-indigo-50/50 to-white px-5 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-lg font-bold text-slate-800 tracking-tight">{booking.resource?.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {booking.resource?.location}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Requested By - subtle */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">Requested by</span>
            <span className="text-sm text-slate-600">{booking.user?.name || 'Unknown'}</span>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-slate-700">{fmtDateTime(booking.startTime).split(',')[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium text-slate-700">
                {fmtDateTime(booking.startTime).split(',')[1]} → {fmtDateTime(booking.endTime).split(',')[1]}
                {duration && <span className="ml-1 text-xs font-normal text-muted-foreground">({duration})</span>}
              </p>
            </div>
          </div>

          {/* Purpose - More prominent with larger text and stronger background */}
          <div className="bg-amber-50 rounded-xl p-3 border-l-4 border-amber-400">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Purpose</p>
            <p className="text-base font-semibold text-amber-800 leading-tight">{booking.purpose || '—'}</p>
          </div>

          {/* Availability - Reduced visual weight (smaller, subtle) */}
          {booking.resource?.capacity && (
            <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">Availability</span>
              <span className="text-xs font-medium text-slate-600">{getCapacityDisplay()}</span>
            </div>
          )}

          {/* Quantity Requested - Medium weight */}
          {booking.expectedAttendees && (
            <div className="flex items-center justify-between text-sm bg-indigo-50/50 rounded-lg px-3 py-2 border border-indigo-100">
              <span className="text-xs text-indigo-600 font-medium">Quantity</span>
              <span className="text-sm font-semibold text-indigo-700">{getQuantityRequestedLabel()}</span>
            </div>
          )}

          {/* Admin reason - if rejected */}
          {booking.adminReason && (
            <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="text-xs">{booking.adminReason}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex gap-2">
          {isAdmin && booking.status === 'PENDING' && (
            <Button
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 text-sm font-medium"
              onClick={() => onReview(booking)}
            >
              Review
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl h-9 text-sm font-medium"
              onClick={() => onCancel(booking)}
            >
              Cancel
            </Button>
          )}
          {!isAdmin && !canCancel && booking.status !== 'PENDING' && (
            <div className="flex-1 text-center text-xs text-muted-foreground py-1.5">
              No actions available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
// ─── MAIN PAGE (Enhanced) ────────────────────────────────────────────────────
export default function BookingsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedResourceId = searchParams.get('resourceId')
  const [showNewBooking, setShowNewBooking] = useState(!!preselectedResourceId)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')

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
  const pastBookings = allBookings.filter(b => new Date(b.startTime) < now)
  const baseList = activeTab === 'upcoming' ? upcomingBookings : pastBookings

  const filtered = baseList.filter(b => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
    const matchSearch = !search ||
      b.resource?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const pendingCount = allBookings.filter(b => b.status === 'PENDING').length
  const approvedCount = allBookings.filter(b => b.status === 'APPROVED').length

  // Summary cards data
  const summaryCards = [
    { label: 'Total Bookings', value: allBookings.length, icon: Calendar, color: 'from-indigo-500 to-purple-500' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Active Bookings', value: approvedCount, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
  ]

  return (
    <div className="space-y-6 pb-4">
      {/* Enhanced Header - Matching Resources Page */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Scheduling</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule and manage resource reservations across the campus.
          </p>
        </div>
        <Button 
          onClick={() => setShowNewBooking(true)} 
          className="gap-2 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Summary Cards - New addition matching Resources style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin summary chips (compact) */}
      {isAdmin && pendingCount > 0 && (
        <div className="flex gap-2">
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            {pendingCount} pending {pendingCount === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      )}

      {/* Enhanced Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <TabButton
          label="Upcoming"
          count={upcomingBookings.length}
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
          icon={Calendar}
        />
        <TabButton
          label="Past"
          count={pastBookings.length}
          active={activeTab === 'past'}
          onClick={() => setActiveTab('past')}
          icon={Clock3}
        />
      </div>

      {/* Enhanced Filters */}
      <Card className="rounded-2xl border-indigo-100 bg-white/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse rounded-2xl">
              <CardContent className="p-6 h-40" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="rounded-2xl border-rose-200 bg-rose-50">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
            <p className="text-rose-600">Failed to load bookings. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <Card className="rounded-2xl border-slate-200 bg-slate-50/50">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-indigo-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No bookings found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming bookings." 
                : "No past bookings to show."}
            </p>
            {activeTab === 'upcoming' && (
              <Button 
                className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowNewBooking(true)}
              >
                Make your first booking
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Admin Analytics */}
      {isAdmin && !isLoading && allBookings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Booking Analytics</h2>
          </div>
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
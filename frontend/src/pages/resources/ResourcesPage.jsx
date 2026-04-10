import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { resourceApi } from '@/api/endpoints'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Users,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Pencil,
  Trash2,
  Monitor,
  FlaskConical,
  Presentation,
  Camera,
  CalendarPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import ResourceFormDialog from './ResourceFormDialog'
import FacilitiesAssistant from './FacilitiesAssistant'

const typeIcons = {
  LECTURE_HALL: Presentation,
  LAB: FlaskConical,
  MEETING_ROOM: Monitor,
  EQUIPMENT: Camera,
}

const typeLabels = {
  LECTURE_HALL: 'Lecture Hall',
  LAB: 'Lab',
  MEETING_ROOM: 'Meeting Room',
  EQUIPMENT: 'Equipment',
}

const typeCardStyles = {
  LECTURE_HALL: 'from-sky-500/15 to-blue-500/10',
  LAB: 'from-emerald-500/15 to-green-500/10',
  MEETING_ROOM: 'from-violet-500/15 to-indigo-500/10',
  EQUIPMENT: 'from-amber-500/15 to-orange-500/10',
}

const resourceTypes = ['LECTURE_HALL', 'MEETING_ROOM', 'LAB', 'EQUIPMENT']

function parseDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null
  const parsed = new Date(`${dateValue}T${timeValue}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeLocationRelevance(resourceLocation, preferredLocation) {
  if (!preferredLocation?.trim()) return 0.5
  if (!resourceLocation?.trim()) return 0

  const resourceText = resourceLocation.toLowerCase()
  const preferredText = preferredLocation.toLowerCase().trim()

  if (resourceText.includes(preferredText) || preferredText.includes(resourceText)) {
    return 1
  }

  const preferredTokens = preferredText.split(/\s+/).filter(Boolean)
  if (preferredTokens.length === 0) return 0.5

  const matched = preferredTokens.filter((token) => resourceText.includes(token)).length
  return matched / preferredTokens.length
}

function computeCapacityFit(resourceCapacity, desiredCapacity) {
  if (!desiredCapacity) return 0.5
  if (!resourceCapacity || resourceCapacity <= 0) return 0

  const gap = Math.abs(resourceCapacity - desiredCapacity)
  const normalizedGap = Math.min(gap / Math.max(desiredCapacity, 1), 1)
  return 1 - normalizedGap
}

function computeAvailabilityFit(resource, desiredStart, desiredEnd) {
  if (!desiredStart || !desiredEnd) return 0.5

  if (resource.status !== 'ACTIVE') return 0
  if (!resource.availabilityDate || !resource.availabilityStart || !resource.availabilityEnd) return 0

  const availableStart = new Date(`${resource.availabilityDate}T${resource.availabilityStart}`)
  const availableEnd = new Date(`${resource.availabilityDate}T${resource.availabilityEnd}`)

  if (Number.isNaN(availableStart.getTime()) || Number.isNaN(availableEnd.getTime())) return 0
  if (desiredEnd <= desiredStart) return 0

  return desiredStart >= availableStart && desiredEnd <= availableEnd ? 1 : 0
}

function getSmartFitScore(resource, preferences) {
  const capacity = computeCapacityFit(resource.capacity, preferences.desiredCapacity)
  const location = computeLocationRelevance(resource.location, preferences.preferredLocation)
  const availability = computeAvailabilityFit(resource, preferences.desiredStart, preferences.desiredEnd)

  const score = (capacity * 0.35) + (location * 0.25) + (availability * 0.4)

  return Math.round(score * 100)
}

function formatDateLabel(dateText) {
  if (!dateText) return 'Not set'
  const parsed = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return dateText

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function formatTimeLabel(timeText) {
  if (!timeText) return 'Not set'
  const [hoursRaw, minutesRaw] = String(timeText).split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeText

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function ResourcesPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minCapacity, setMinCapacity] = useState('')
  const [sortMode, setSortMode] = useState('DEFAULT')
  const [preferredLocation, setPreferredLocation] = useState('')
  const [desiredCapacity, setDesiredCapacity] = useState('')
  const [desiredDate, setDesiredDate] = useState('')
  const [desiredStartTime, setDesiredStartTime] = useState('')
  const [desiredEndTime, setDesiredEndTime] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)

  const { data: allResources = [], isLoading } = useQuery({
    queryKey: ['resources', { search, status: statusFilter, minCapacity }],
    queryFn: () =>
      resourceApi
        .getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          minCapacity: minCapacity ? Number(minCapacity) : undefined,
        })
        .then((res) => res.data),
  })

  const resources = selectedCategory
    ? allResources.filter((resource) => resource.type === selectedCategory)
    : allResources

  const desiredStart = parseDateTime(desiredDate, desiredStartTime)
  const desiredEnd = parseDateTime(desiredDate, desiredEndTime)

  const displayedResources = sortMode === 'SMART_FIT'
    ? [...resources]
      .map((resource) => ({
        ...resource,
        smartFitScore: getSmartFitScore(resource, {
          desiredCapacity: desiredCapacity ? Number(desiredCapacity) : null,
          preferredLocation,
          desiredStart,
          desiredEnd,
        }),
      }))
      .sort((a, b) => b.smartFitScore - a.smartFitScore)
    : resources

  const applyAssistantFilters = (patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
      setSelectedCategory(patch.type || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
      setStatusFilter(patch.status || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'minCapacity')) {
      setMinCapacity(patch.minCapacity ? String(patch.minCapacity) : '')
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => resourceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      toast.success('Resource deleted successfully')
    },
    onError: () => toast.error('Failed to delete resource'),
  })

  const handleEdit = (resource) => {
    setEditingResource(resource)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingResource(null)
    setDialogOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleBookNow = (resource) => {
    const query = new URLSearchParams({
      resourceId: String(resource.id),
      resourceName: resource.name,
    })
    navigate(`/bookings?${query.toString()}`)
  }

  const resourceCounts = resourceTypes.reduce((acc, type) => {
    acc[type] = allResources.filter((resource) => resource.type === type).length
    return acc
  }, {})

  return (
    <div className="space-y-6 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Facilities & Resources</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage campus resources, halls, labs, rooms, and equipment.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-indigo-100 bg-white/90 shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Search And Ranking</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
              placeholder="Min capacity"
              className="w-full rounded-xl border-slate-200 bg-slate-50 sm:w-[140px]"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                <SelectValue placeholder="Sort mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Default order</SelectItem>
                <SelectItem value="SMART_FIT">Best Fit (Smart Sort)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="Preferred location"
              className="rounded-xl border-slate-200 bg-slate-50"
            />

            <Input
              type="number"
              min="1"
              value={desiredCapacity}
              onChange={(e) => setDesiredCapacity(e.target.value)}
              placeholder="Desired capacity"
              className="rounded-xl border-slate-200 bg-slate-50"
            />

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Desired Date</p>
              <Input
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Start Time</p>
              <Input
                type="time"
                value={desiredStartTime}
                onChange={(e) => setDesiredStartTime(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">End Time</p>
              <Input
                type="time"
                value={desiredEndTime}
                onChange={(e) => setDesiredEndTime(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Selected Date</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatDateLabel(desiredDate)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">From</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatTimeLabel(desiredStartTime)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">To</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatTimeLabel(desiredEndTime)}</p>
            </div>
          </div>

          {sortMode === 'SMART_FIT' && (
            <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Best Fit uses capacity closeness, location relevance, and availability for the selected date/time.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resourceTypes.map((type) => {
          const Icon = typeIcons[type]
          const isSelected = selectedCategory === type

          return (
            <Card
              key={type}
              className={`cursor-pointer rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isSelected ? 'border-indigo-400 ring-2 ring-indigo-300/60 shadow-sm' : 'border-slate-200'
              }`}
              onClick={() => setSelectedCategory(type)}
            >
              <CardContent className={`rounded-2xl bg-gradient-to-br p-5 ${typeCardStyles[type] || 'from-slate-100 to-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{typeLabels[type]}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-800">{resourceCounts[type] || 0}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow-sm">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedCategory && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {typeLabels[selectedCategory]} resources only
          </p>
          <Button type="button" variant="outline" size="sm" className="rounded-xl border-slate-300" onClick={() => setSelectedCategory('')}>
            Show all resources
          </Button>
        </div>
      )}

      <FacilitiesAssistant resources={displayedResources} onApplyFilters={applyAssistantFilters} />

      {/* Resource grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : displayedResources.length === 0 ? (
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No resources found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || selectedCategory || statusFilter || minCapacity
                ? 'Try adjusting your filters.'
                : isAdmin
                ? 'Get started by adding your first resource.'
                : 'No resources available yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedResources.map((resource, index) => {
            const Icon = typeIcons[resource.type] || Building2
            const isBestMatch = sortMode === 'SMART_FIT' && index === 0
            return (
              <Card
                key={resource.id}
                className={`group rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isBestMatch
                    ? 'border-2 border-emerald-400 ring-2 ring-emerald-200/70'
                    : 'border-slate-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                        <Icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight text-slate-900">{resource.name}</h3>
                        <p className="mt-0.5 text-xs uppercase tracking-[0.1em] text-slate-500">
                          {typeLabels[resource.type] || resource.type}
                        </p>
                        {sortMode === 'SMART_FIT' && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {isBestMatch && (
                              <p className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                Best Match
                              </p>
                            )}
                            <p className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Best Fit Score: {resource.smartFitScore ?? 0}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(resource)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(resource.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {resource.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {resource.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {resource.location}
                    </div>
                    {resource.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {resource.capacity}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Availability</p>
                    <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatDateLabel(resource.availabilityDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {resource.availabilityStart && resource.availabilityEnd
                            ? `${formatTimeLabel(resource.availabilityStart)} - ${formatTimeLabel(resource.availabilityEnd)}`
                            : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                    <Badge variant={resource.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {resource.status === 'ACTIVE' ? 'Active' : 'Out of Service'}
                    </Badge>
                    <span className="text-xs font-medium text-slate-500">{typeLabels[resource.type] || resource.type}</span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2 rounded-xl border-slate-300"
                    onClick={() => handleBookNow(resource)}
                    disabled={resource.status !== 'ACTIVE'}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
      />
    </div>
  )
}

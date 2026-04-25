import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, CalendarPlus, Clock3, MapPin, MoreHorizontal, Pencil, Phone, Trash2, User, Users } from 'lucide-react'
import { resourceApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { getResourceCategoryByKey } from './resourceCategoryConfig'

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

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

function computeSubcategoryFit(resourceSubcategory, preferredSubcategory) {
  if (!preferredSubcategory?.trim()) return 0.5
  if (!resourceSubcategory?.trim()) return 0

  const resourceText = resourceSubcategory.toLowerCase().trim()
  const preferredText = preferredSubcategory.toLowerCase().trim()
  return resourceText === preferredText ? 1 : 0
}

function computeNameFit(resourceName, preferredName) {
  if (!preferredName?.trim()) return 0.5
  if (!resourceName?.trim()) return 0

  const resourceText = resourceName.toLowerCase().trim()
  const preferredText = preferredName.toLowerCase().trim()

  if (resourceText === preferredText) return 1
  if (resourceText.includes(preferredText)) return 0.8
  return 0
}

function getSmartFitScore(resource, preferences) {
  const factors = []

  factors.push({ weight: 0.2, score: computeNameFit(resource.name, preferences.preferredName) })

  if (preferences.profile.useSubcategory) {
    factors.push({ weight: 0.2, score: computeSubcategoryFit(resource.resourceSubcategory, preferences.preferredSubcategory) })
  }

  if (preferences.profile.useCapacity) {
    factors.push({ weight: 0.35, score: computeCapacityFit(resource.capacity, preferences.desiredCapacity) })
  }
  if (preferences.profile.useLocation) {
    factors.push({ weight: 0.25, score: computeLocationRelevance(resource.location, preferences.preferredLocation) })
  }
  if (preferences.profile.useSchedule) {
    factors.push({ weight: 0.4, score: computeAvailabilityFit(resource, preferences.desiredStart, preferences.desiredEnd) })
  }

  if (factors.length === 0) {
    return 50
  }

  const weightedSum = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0)
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)
  return Math.round((weightedSum / totalWeight) * 100)
}

function getMatchProfile(categoryValue) {
  if (categoryValue === 'Facilities (Locations)') {
    return {
      useSubcategory: true,
      useLocation: true,
      useCapacity: true,
      useSchedule: true,
      capacityLabel: 'Desired capacity',
      helperText: 'Best Match uses category, location, capacity, and time availability for spaces.',
    }
  }

  if (categoryValue === 'Electronic equipment') {
    return {
      useSubcategory: true,
      useLocation: true,
      useCapacity: true,
      useSchedule: false,
      capacityLabel: 'Desired amount',
      helperText: 'Best Match uses category, location, and quantity fit for equipment items.',
    }
  }

  if (categoryValue === 'Study materials') {
    return {
      useSubcategory: true,
      useLocation: true,
      useCapacity: true,
      useSchedule: false,
      capacityLabel: 'Desired amount',
      helperText: 'Best Match uses category, location, and available amount for study materials.',
    }
  }

  if (categoryValue === 'Laboratory resources') {
    return {
      useSubcategory: true,
      useLocation: true,
      useCapacity: true,
      useSchedule: true,
      capacityLabel: 'Desired amount',
      helperText: 'Best Match uses category, location, quantity fit, and availability for lab resources.',
    }
  }

  if (categoryValue === 'Shared utilities') {
    return {
      useSubcategory: true,
      useLocation: true,
      useCapacity: true,
      useSchedule: true,
      capacityLabel: 'Desired amount',
      helperText: 'Best Match uses category, location, quantity fit, and availability for shared utilities.',
    }
  }

  return {
    useSubcategory: true,
    useLocation: true,
    useCapacity: true,
    useSchedule: true,
    capacityLabel: 'Desired capacity',
    helperText: 'Best Match uses category, location, capacity, and availability.',
  }
}

export default function ResourceCategoryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { categoryKey } = useParams()
  const { isAdmin } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [sortMode, setSortMode] = useState('DEFAULT')
  const [preferredName, setPreferredName] = useState('')
  const [preferredSubcategory, setPreferredSubcategory] = useState('')
  const [preferredLocation, setPreferredLocation] = useState('')
  const [desiredCapacity, setDesiredCapacity] = useState('')
  const [desiredDate, setDesiredDate] = useState('')
  const [desiredStartTime, setDesiredStartTime] = useState('')
  const [desiredEndTime, setDesiredEndTime] = useState('')

  const selectedCategory = getResourceCategoryByKey(categoryKey)
  const matchProfile = useMemo(
    () => getMatchProfile(selectedCategory?.value || ''),
    [selectedCategory],
  )

  const { data: allResources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll().then((res) => res.data),
  })

  const resources = useMemo(() => {
    if (!selectedCategory) return []

    const selected = normalizeText(selectedCategory.value)
    return allResources
      .filter((resource) => normalizeText(resource.resourceCategory) === selected)
      .filter((resource) => {
        if (!preferredName.trim()) return true
        return normalizeText(resource.name).includes(normalizeText(preferredName))
      })
  }, [allResources, selectedCategory, preferredName])

  const availableSubcategories = useMemo(() => {
    const values = new Set(
      resources
        .map((resource) => String(resource.resourceSubcategory || '').trim())
        .filter(Boolean),
    )
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [resources])

  const desiredStart = parseDateTime(desiredDate, desiredStartTime)
  const desiredEnd = parseDateTime(desiredDate, desiredEndTime)

  const displayedResources = sortMode === 'SMART_FIT'
    ? [...resources]
      .map((resource) => ({
        ...resource,
        smartFitScore: getSmartFitScore(resource, {
          profile: matchProfile,
          preferredName,
          preferredSubcategory,
          desiredCapacity: desiredCapacity ? Number(desiredCapacity) : null,
          preferredLocation,
          desiredStart,
          desiredEnd,
        }),
      }))
      .sort((a, b) => b.smartFitScore - a.smartFitScore)
    : resources

  const applyAssistantFilters = (patch) => {
    setSortMode('SMART_FIT')

    if (Object.prototype.hasOwnProperty.call(patch, 'preferredName')) {
      setPreferredName(patch.preferredName || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'preferredSubcategory')) {
      setPreferredSubcategory(patch.preferredSubcategory || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'preferredLocation')) {
      setPreferredLocation(patch.preferredLocation || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'desiredCapacity')) {
      setDesiredCapacity(patch.desiredCapacity ? String(patch.desiredCapacity) : '')
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

  if (!selectedCategory) {
    return (
      <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Category Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">The selected resource category does not exist.</p>
          <Button type="button" className="mt-4 rounded-xl" onClick={() => navigate('/resources')}>
            Back To Resource Types
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Resource Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{selectedCategory.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Showing resources in this category.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              type="button"
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => navigate(`/resources/new?resourceType=${encodeURIComponent(selectedCategory.value)}`)}
            >
              Add New Resource
            </Button>
          )}
          <Button type="button" variant="outline" className="rounded-xl border-slate-300 dark:border-slate-600" onClick={() => navigate('/resources')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-indigo-100 bg-white dark:bg-gray-900/90 shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Best Match Filter</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <SelectValue placeholder="Sort mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Default order</SelectItem>
                <SelectItem value="SMART_FIT">Best Match</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Resource name"
              className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />

            {matchProfile.useSubcategory && (
              <Select value={preferredSubcategory || 'ALL'} onValueChange={(v) => setPreferredSubcategory(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {availableSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {matchProfile.useLocation && (
              <Input
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                placeholder="Preferred location"
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            )}

            {matchProfile.useCapacity && (
              <Input
                type="number"
                min="1"
                value={desiredCapacity}
                onChange={(e) => setDesiredCapacity(e.target.value)}
                placeholder={matchProfile.capacityLabel}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            )}

            {matchProfile.useSchedule && (
              <Input
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            )}

            {matchProfile.useSchedule && (
              <Input
                type="time"
                value={desiredStartTime}
                onChange={(e) => setDesiredStartTime(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            )}

            {matchProfile.useSchedule && (
              <Input
                type="time"
                value={desiredEndTime}
                onChange={(e) => setDesiredEndTime(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            )}
          </div>

          {sortMode === 'SMART_FIT' && (
            <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              {matchProfile.helperText}
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-400">Loading resources...</CardContent>
        </Card>
      ) : displayedResources.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-400">No resources found in this category yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedResources.map((resource, index) => {
            const isBestMatch = sortMode === 'SMART_FIT' && index === 0
            return (
            <Card key={resource.id} className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{resource.name}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{resource.resourceSubcategory || 'No subcategory'}</p>
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
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                      {resource.status || 'UNKNOWN'}
                    </Badge>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{resource.location || 'Location not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>Capacity: {resource.capacity ?? 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{formatDateLabel(resource.availabilityDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>
                      {formatTimeLabel(resource.availabilityStart)} - {formatTimeLabel(resource.availabilityEnd)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{resource.contactPerson || 'Contact person not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{resource.contactNumber || 'Contact number not set'}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 rounded-xl border-slate-300 dark:border-slate-600"
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

      <FacilitiesAssistant
        resources={resources}
        onApplyFilters={applyAssistantFilters}
        mode="category"
        subcategoryOptions={availableSubcategories}
      />

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editingResource}
      />
    </div>
  )
}

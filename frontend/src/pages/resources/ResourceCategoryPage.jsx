import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CalendarPlus, Clock3, MapPin, Phone, User, Users } from 'lucide-react'
import { resourceApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
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

export default function ResourceCategoryPage() {
  const navigate = useNavigate()
  const { categoryKey } = useParams()
  const { isAdmin } = useAuth()

  const selectedCategory = getResourceCategoryByKey(categoryKey)

  const { data: allResources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll().then((res) => res.data),
  })

  const resources = useMemo(() => {
    if (!selectedCategory) return []

    const selected = normalizeText(selectedCategory.value)
    return allResources.filter((resource) => normalizeText(resource.resourceCategory) === selected)
  }, [allResources, selectedCategory])

  const handleBookNow = (resource) => {
    const query = new URLSearchParams({
      resourceId: String(resource.id),
      resourceName: resource.name,
    })
    navigate(`/bookings?${query.toString()}`)
  }

  if (!selectedCategory) {
    return (
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-slate-900">Category Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">The selected resource category does not exist.</p>
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
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{selectedCategory.title}</h1>
          <p className="mt-1 text-sm text-slate-600">Showing resources in this category.</p>
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
          <Button type="button" variant="outline" className="rounded-xl border-slate-300" onClick={() => navigate('/resources')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600">Loading resources...</CardContent>
        </Card>
      ) : resources.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600">No resources found in this category yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{resource.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{resource.resourceSubcategory || 'No subcategory'}</p>
                  </div>
                  <Badge className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                    {resource.status || 'UNKNOWN'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>{resource.location || 'Location not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span>Capacity: {resource.capacity ?? 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span>{formatDateLabel(resource.availabilityDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    <span>
                      {formatTimeLabel(resource.availabilityStart)} - {formatTimeLabel(resource.availabilityEnd)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>{resource.contactPerson || 'Contact person not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>{resource.contactNumber || 'Contact number not set'}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 rounded-xl border-slate-300"
                  onClick={() => handleBookNow(resource)}
                  disabled={resource.status !== 'ACTIVE'}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

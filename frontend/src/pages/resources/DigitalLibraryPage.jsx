import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, CalendarPlus, Clock3, MapPin, Search, Users } from 'lucide-react'
import { resourceApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function DigitalLibraryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: allResources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourceApi.getAll().then((res) => res.data),
  })

  const resources = useMemo(() => {
    const query = normalizeText(search)

    return allResources.filter((resource) => {
      const isDigitalLibrary = normalizeText(resource.resourceCategory) === 'study materials'
      if (!isDigitalLibrary) return false
      if (!query) return true

      return (
        normalizeText(resource.name).includes(query)
        || normalizeText(resource.resourceSubcategory).includes(query)
        || normalizeText(resource.location).includes(query)
      )
    })
  }, [allResources, search])

  const handleBookNow = (resource) => {
    const query = new URLSearchParams({
      resourceId: String(resource.id),
      resourceName: resource.name,
    })
    navigate(`/bookings?${query.toString()}`)
  }

  return (
    <div className="space-y-6 pb-2">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Digital Library</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Digital Library Resources</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Browse and book available study materials.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search digital library resources"
              className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-400">Loading digital library resources...</CardContent>
        </Card>
      ) : resources.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-400">No digital library resources found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{resource.name}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{resource.resourceSubcategory || 'No subcategory'}</p>
                  </div>
                  <Badge className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                    {resource.status || 'UNKNOWN'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{resource.resourceCategory || 'Study materials'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{resource.location || 'Location not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>Amount: {resource.capacity ?? 'Not set'}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
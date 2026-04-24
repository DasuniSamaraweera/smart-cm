import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CALENDAR_HIDDEN_RESOURCE_TERMS = ['eternia', 'projector']

function shouldHideFromCalendar(resource) {
  const name = String(resource?.name || '').toLowerCase()
  if (!name) return false

  return CALENDAR_HIDDEN_RESOURCE_TERMS.some((term) => name.includes(term))
}

function getDayBounds(date) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  return { dayStart, dayEnd }
}

function getMonthCells(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const firstCell = new Date(firstDay)
  firstCell.setDate(firstCell.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell)
    date.setDate(firstCell.getDate() + index)
    return {
      date,
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    }
  })
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

function hasOverlap(booking, targetDate) {
  const { dayStart, dayEnd } = getDayBounds(targetDate)
  const bookingStart = new Date(booking.startTime)
  const bookingEnd = new Date(booking.endTime)

  return bookingStart < dayEnd && bookingEnd > dayStart
}

function matchesAvailabilityDate(resource, targetDate) {
  if (!resource?.availabilityDate) return true

  const [year, month, day] = resource.availabilityDate.split('-').map(Number)
  if (!year || !month || !day) return false

  return (
    targetDate.getFullYear() === year
    && targetDate.getMonth() + 1 === month
    && targetDate.getDate() === day
  )
}

function formatTime(value) {
  if (!value) return '--:--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ResourceAvailabilityCalendar({ resources = [], bookings = [], isLoading = false }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(new Date())

  const activeResources = useMemo(
    () => resources.filter((resource) => resource.status === 'ACTIVE' && !shouldHideFromCalendar(resource)),
    [resources],
  )

  const approvedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'APPROVED' && booking.startTime && booking.endTime),
    [bookings],
  )

  const monthCells = useMemo(() => getMonthCells(visibleMonth), [visibleMonth])

  const getAvailabilityForDate = (date) => {
    const resourcesForDate = activeResources.filter((resource) => matchesAvailabilityDate(resource, date))

    if (resourcesForDate.length === 0) {
      return { availableCount: 0, dayBookings: [], resourcesForDate: [] }
    }

    const resourceIdsForDate = new Set(resourcesForDate.map((resource) => resource.id))

    const dayBookings = approvedBookings.filter(
      (booking) => hasOverlap(booking, date) && resourceIdsForDate.has(booking.resource?.id),
    )
    const bookedResourceIds = new Set(
      dayBookings
        .map((booking) => booking.resource?.id)
        .filter((resourceId) => resourceId != null),
    )

    return {
      availableCount: Math.max(resourcesForDate.length - bookedResourceIds.size, 0),
      dayBookings,
      resourcesForDate,
    }
  }

  const selectedDay = getAvailabilityForDate(selectedDate)

  const selectedDayByResource = useMemo(() => {
    const grouped = new Map()

    selectedDay.dayBookings.forEach((booking) => {
      const key = booking.resource?.id
      if (key == null) return

      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key).push(booking)
    })

    return grouped
  }, [selectedDay.dayBookings])

  const goToPreviousMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Resource Availability Calendar</CardTitle>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Daily availability based on active resources and approved bookings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md border-slate-300 dark:border-slate-600" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="w-44 text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
              {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md border-slate-300 dark:border-slate-600" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium">Calendar View</span>
          <div className="flex items-center gap-1">
            <span className="rounded bg-white dark:bg-gray-900 px-2 py-0.5 text-slate-800 dark:text-slate-200 shadow-sm">Month</span>
            <span className="rounded px-2 py-0.5">Week</span>
            <span className="rounded px-2 py-0.5">Day</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800">
            {WEEK_DAYS.map((day) => (
              <p
                key={day}
                className="border-b border-r border-slate-200 dark:border-slate-700 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 last:border-r-0"
              >
                {day}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthCells.map(({ date, inCurrentMonth }) => {
              const { availableCount, resourcesForDate } = getAvailabilityForDate(date)
              const isSelected = isSameDay(date, selectedDate)
              const isToday = isSameDay(date, new Date())

              let availabilityTone = 'text-emerald-600'
              if (availableCount === 0 && activeResources.length > 0) {
                availabilityTone = 'text-red-600'
              } else if (availableCount < activeResources.length) {
                availabilityTone = 'text-amber-600'
              }

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'h-16 border-b border-r border-slate-200 dark:border-slate-700 p-1.5 text-left transition-colors sm:h-20',
                    'flex flex-col justify-between',
                    !inCurrentMonth && 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                    isSelected && 'bg-amber-50 ring-1 ring-inset ring-amber-300',
                    !isSelected && 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                  )}
                >
                  <p className={cn('text-xs font-semibold sm:text-sm', isToday && 'text-indigo-600')}>{date.getDate()}</p>
                  <p className={cn('text-[9px] leading-tight sm:text-[10px]', availabilityTone, 'truncate')}>
                    {activeResources.length === 0 ? 'No active resources' : `${availableCount}/${resourcesForDate.length} free`}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {activeResources.length === 0
                  ? 'No active resources configured.'
                  : `${selectedDay.availableCount} of ${selectedDay.resourcesForDate.length} resources available for this date`}
              </p>
            </div>
            <Badge variant={selectedDay.availableCount === 0 && activeResources.length > 0 ? 'destructive' : 'secondary'}>
              {activeResources.length === 0 ? 'N/A' : `${selectedDay.availableCount} Available`}
            </Badge>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading availability...</p>
          ) : activeResources.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Add and activate resources to see calendar availability.</p>
          ) : selectedDay.resourcesForDate.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No resources are scheduled for the selected date.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {selectedDay.resourcesForDate.map((resource) => {
                const dayBookings = selectedDayByResource.get(resource.id) || []
                const isBooked = dayBookings.length > 0

                return (
                  <div
                    key={resource.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-md border px-3 py-2',
                      isBooked ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">{resource.location}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-medium', isBooked ? 'text-amber-700' : 'text-emerald-700')}>
                        {isBooked ? 'Booked' : 'Available'}
                      </p>
                      {isBooked && (
                        <p className="text-[11px] text-muted-foreground">
                          {dayBookings
                            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                            .map((booking) => `${formatTime(booking.startTime)}-${formatTime(booking.endTime)}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

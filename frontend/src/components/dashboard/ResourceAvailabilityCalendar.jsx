import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    () => resources.filter((resource) => resource.status === 'ACTIVE'),
    [resources],
  )

  const approvedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'APPROVED' && booking.startTime && booking.endTime),
    [bookings],
  )

  const monthCells = useMemo(() => getMonthCells(visibleMonth), [visibleMonth])

  const getAvailabilityForDate = (date) => {
    if (activeResources.length === 0) {
      return { availableCount: 0, dayBookings: [] }
    }

    const dayBookings = approvedBookings.filter((booking) => hasOverlap(booking, date))
    const bookedResourceIds = new Set(
      dayBookings
        .map((booking) => booking.resource?.id)
        .filter((resourceId) => resourceId != null),
    )

    return {
      availableCount: Math.max(activeResources.length - bookedResourceIds.size, 0),
      dayBookings,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Resource Availability Calendar</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily availability based on active resources and approved bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-40 text-center text-sm font-medium">
            {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <Button type="button" variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => (
            <p key={day} className="text-center text-xs font-medium uppercase text-muted-foreground">
              {day}
            </p>
          ))}

          {monthCells.map(({ date, inCurrentMonth }) => {
            const { availableCount } = getAvailabilityForDate(date)
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
                  'rounded-md border p-2 text-left transition-colors',
                  !inCurrentMonth && 'opacity-45',
                  isSelected && 'border-primary bg-primary/5',
                  !isSelected && 'hover:bg-muted/60',
                )}
              >
                <p className={cn('text-sm font-semibold', isToday && 'text-primary')}>{date.getDate()}</p>
                <p className={cn('mt-1 text-[11px]', availabilityTone)}>
                  {activeResources.length === 0 ? 'No active resources' : `${availableCount}/${activeResources.length} free`}
                </p>
              </button>
            )
          })}
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeResources.length === 0
                  ? 'No active resources configured.'
                  : `${selectedDay.availableCount} of ${activeResources.length} resources available`}
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
          ) : (
            <div className="mt-4 space-y-2">
              {activeResources.map((resource) => {
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

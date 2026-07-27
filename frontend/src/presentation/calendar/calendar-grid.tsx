import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clapperboard, ListChecks, Music, Tv } from 'lucide-react'
import { useCalendar } from '#application/calendar/calendar.query'
import { Button } from '#presentation/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#presentation/ui/tabs'
import { Skeleton } from '#presentation/ui/skeleton'
import { ErrorState } from '#presentation/shared/error-state'
import { cn } from '#presentation/shared/utils'
import type { CalendarEntry } from '#domain/calendar/calendar-entry'

const KIND_TABS = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'movie', label: 'Movies', icon: Clapperboard },
  { value: 'episode', label: 'Series', icon: Tv },
  { value: 'album', label: 'Music', icon: Music },
] as const
type KindTab = (typeof KIND_TABS)[number]['value']

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 6 full weeks (42 days), Monday-start, padded with the adjacent months. */
function getMonthGridDays(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekdayOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - firstWeekdayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
}

export function CalendarGrid() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [kindTab, setKindTab] = useState<KindTab>('all')

  const gridDays = useMemo(() => getMonthGridDays(currentMonth), [currentMonth])
  const startDate = toDateKey(gridDays[0] ?? currentMonth)
  const endDate = toDateKey(gridDays.at(-1) ?? currentMonth)

  const { data, isLoading, isError, refetch } = useCalendar(startDate, endDate)

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const entry of data ?? []) {
      if (kindTab !== 'all' && entry.kind !== kindTab) continue
      const list = map.get(entry.releaseDate) ?? []
      list.push(entry)
      map.set(entry.releaseDate, list)
    }
    return map
  }, [data, kindTab])

  function goToPreviousMonth() {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))
  }

  if (isError) {
    return <ErrorState message="Could not load the calendar." onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="w-40 text-center text-sm font-medium">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Tabs value={kindTab} onValueChange={(value) => setKindTab(value as KindTab)}>
          <TabsList>
            {KIND_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <tab.icon className="size-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridDays.map((day) => {
              const dateKey = toDateKey(day)
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
              const entries = entriesByDay.get(dateKey) ?? []

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-28 space-y-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0',
                    !isCurrentMonth && 'bg-muted/30',
                  )}
                >
                  <p
                    className={cn(
                      'text-xs',
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {day.getDate()}
                  </p>
                  <div className="space-y-1">
                    {entries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="truncate rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                        title={entry.subtitle ? `${entry.title} — ${entry.subtitle}` : entry.title}
                      >
                        {entry.subtitle ? `${entry.subtitle} ` : ''}
                        {entry.title}
                      </div>
                    ))}
                    {entries.length > 3 ? (
                      <p className="text-[11px] text-muted-foreground">
                        +{entries.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

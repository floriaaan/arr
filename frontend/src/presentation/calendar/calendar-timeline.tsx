import { useMemo } from 'react'
import { Clapperboard, Music, Tv } from 'lucide-react'
import { Badge } from '#presentation/ui/badge'
import { EmptyState } from '#presentation/shared/empty-state'
import { cn } from '#presentation/shared/utils'
import { groupEntriesByDay } from './group-entries-by-day'
import type { CalendarEntry, CalendarEntryKind } from '#domain/calendar/calendar-entry'

const ENTRY_ICON: Record<CalendarEntryKind, typeof Clapperboard> = {
  movie: Clapperboard,
  episode: Tv,
  album: Music,
}

function formatDayHeading(dateKey: string): string {
  // `dateKey` is a plain `YYYY-MM-DD`; parsing it as-is would land on UTC
  // midnight and shift the label a day west of Greenwich.
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function isSameDay(dateKey: string, other: Date): boolean {
  return (
    dateKey ===
    `${other.getFullYear()}-${String(other.getMonth() + 1).padStart(2, '0')}-${String(other.getDate()).padStart(2, '0')}`
  )
}

/**
 * The grid can only show the first few entries of a busy day; this lists
 * every entry of the displayed range, so nothing is unreachable behind a
 * "+N more" (cf. docs/phase-5-quality-of-life, chantier 4 décision 3).
 * Presentation only — it receives entries already filtered by the grid.
 */
export function CalendarTimeline({
  entries,
  onSelect,
}: {
  entries: CalendarEntry[]
  onSelect: (entry: CalendarEntry) => void
}) {
  const groups = useMemo(() => groupEntriesByDay(entries), [entries])
  const today = new Date()

  if (groups.length === 0) {
    return <EmptyState title="Nothing scheduled" description="No release in the displayed month." />
  }

  return (
    <ol className="relative space-y-6 border-l pl-6">
      {groups.map((group) => {
        const isToday = isSameDay(group.dateKey, today)
        return (
          <li key={group.dateKey} className="space-y-2">
            <span
              className={cn(
                'absolute -left-[5px] mt-1.5 size-2.5 rounded-none ring-4 ring-background',
                isToday ? 'bg-primary' : 'bg-border',
              )}
              aria-hidden="true"
            />
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{formatDayHeading(group.dateKey)}</h3>
              {isToday ? (
                <Badge variant="secondary" className="text-[10px]">
                  Today
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {group.entries.length} {group.entries.length > 1 ? 'releases' : 'release'}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.entries.map((entry) => {
                const Icon = ENTRY_ICON[entry.kind]
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={!entry.externalId}
                    onClick={() => onSelect(entry)}
                    className="tap-scale flex w-full items-center gap-3 rounded-none border p-2 text-left enabled:hover:bg-accent disabled:cursor-default disabled:opacity-70"
                  >
                    <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-none bg-muted">
                      {entry.posterUrl ? (
                        <img
                          src={entry.posterUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <Icon className="size-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.subtitle ?? entry.kind}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {entry.monitored ? null : (
                        <Badge variant="outline" className="text-[10px]">
                          Unmonitored
                        </Badge>
                      )}
                      <Badge
                        variant={entry.hasFile ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {entry.hasFile ? 'Downloaded' : 'Missing'}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

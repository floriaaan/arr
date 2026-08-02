import type { CalendarEntry } from '#domain/calendar/calendar-entry'

export interface CalendarDayGroup {
  dateKey: string
  entries: CalendarEntry[]
}

/**
 * Chronological, one group per day that actually has something — empty days
 * are dropped, unlike the grid, which has to render them to keep its shape
 * (cf. docs/phase-5-quality-of-life, chantier 4 décision 5).
 */
export function groupEntriesByDay(entries: CalendarEntry[]): CalendarDayGroup[] {
  const byDay = new Map<string, CalendarEntry[]>()

  for (const entry of entries) {
    const group = byDay.get(entry.releaseDate) ?? []
    group.push(entry)
    byDay.set(entry.releaseDate, group)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayEntries]) => ({
      dateKey,
      entries: [...dayEntries].sort(
        (a, b) => (a.subtitle ?? '').localeCompare(b.subtitle ?? '') || a.title.localeCompare(b.title),
      ),
    }))
}

import { describe, test, expect } from 'vitest'
import { groupEntriesByDay } from '#presentation/calendar/group-entries-by-day'
import type { CalendarEntry } from '#domain/calendar/calendar-entry'

function anEntry(overrides: Partial<CalendarEntry> & { id: string }): CalendarEntry {
  return {
    kind: 'movie',
    title: 'Untitled',
    subtitle: null,
    releaseDate: '2026-01-10',
    posterUrl: null,
    monitored: true,
    hasFile: false,
    instanceId: 'radarr-1',
    externalId: { scheme: 'tmdb', value: '1' },
    ...overrides,
  }
}

describe('groupEntriesByDay', () => {
  test('groups by release date, chronologically', () => {
    const groups = groupEntriesByDay([
      anEntry({ id: 'c', releaseDate: '2026-02-03' }),
      anEntry({ id: 'a', releaseDate: '2026-01-10' }),
      anEntry({ id: 'b', releaseDate: '2026-01-10' }),
    ])

    expect(groups.map((group) => group.dateKey)).toEqual(['2026-01-10', '2026-02-03'])
    expect(groups[0]?.entries).toHaveLength(2)
    expect(groups[1]?.entries).toHaveLength(1)
  })

  test('drops nothing — every entry lands in exactly one group', () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      anEntry({ id: `e-${index}`, releaseDate: '2026-01-10' }),
    )

    const groups = groupEntriesByDay(entries)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.entries).toHaveLength(12)
  })

  test('orders a day by episode number first, then title', () => {
    const groups = groupEntriesByDay([
      anEntry({ id: 'z', kind: 'episode', title: 'Zulu', subtitle: 'S01E02' }),
      anEntry({ id: 'a', kind: 'episode', title: 'Alpha', subtitle: 'S01E01' }),
      anEntry({ id: 'm', title: 'Movie' }),
    ])

    expect(groups[0]?.entries.map((entry) => entry.id)).toEqual(['m', 'a', 'z'])
  })

  test('returns no group at all for an empty range', () => {
    expect(groupEntriesByDay([])).toEqual([])
  })
})

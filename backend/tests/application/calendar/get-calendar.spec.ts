import { test } from '@japa/runner'
import { GetCalendar } from '#application/calendar/get-calendar.use-case'
import { CalendarEntry } from '#domain/catalog/calendar-entry.entity'
import { FakeMediaLibrary } from '../library/fakes.js'

test.group('GetCalendar', () => {
  test('delegates the range to MediaLibrary and returns its results', async ({ assert }) => {
    const library = new FakeMediaLibrary()
    library.calendarResult = [
      CalendarEntry.create('sonarr:instance-1:42', {
        kind: 'episode',
        title: 'Severance',
        subtitle: 'S02E01',
        releaseDate: '2026-01-17',
        posterRef: null,
        monitored: true,
        hasFile: false,
        instanceId: 'instance-1',
      }),
    ]

    const start = new Date('2026-01-01')
    const end = new Date('2026-01-31')
    const result = await new GetCalendar(library).execute({ start, end })

    assert.lengthOf(result, 1)
    assert.deepEqual(library.lastCalendarRange, { start, end })
  })
})

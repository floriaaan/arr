import type { UseCase } from '#application/shared/use-case'
import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { CalendarEntry } from '#domain/catalog/calendar-entry.entity'

export interface GetCalendarInput {
  start: Date
  end: Date
}

export class GetCalendar implements UseCase<GetCalendarInput, CalendarEntry[]> {
  constructor(private readonly library: MediaLibrary) {}

  async execute(input: GetCalendarInput): Promise<CalendarEntry[]> {
    return this.library.calendar(input.start, input.end)
  }
}

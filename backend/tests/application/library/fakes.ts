import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { LibraryItem } from '#domain/catalog/library-item.entity'
import type { CalendarEntry } from '#domain/catalog/calendar-entry.entity'

export class FakeMediaLibrary implements MediaLibrary {
  listResult: LibraryItem[] = []
  calendarResult: CalendarEntry[] = []
  lastListKind: MediaKind | undefined = undefined
  lastCalendarRange: { start: Date; end: Date } | null = null

  async list(kind?: MediaKind): Promise<LibraryItem[]> {
    this.lastListKind = kind
    return this.listResult
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    this.lastCalendarRange = { start, end }
    return this.calendarResult
  }
}

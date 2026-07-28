import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { LibraryItem } from '#domain/catalog/library-item.entity'
import type { CalendarEntry } from '#domain/catalog/calendar-entry.entity'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

export class FakeMediaLibrary implements MediaLibrary {
  listResult: LibraryItem[] = []
  calendarResult: CalendarEntry[] = []
  removeResult: Result<void, ConnectionError> = Result.ok(undefined)
  lastListKind: MediaKind | undefined = undefined
  lastCalendarRange: { start: Date; end: Date } | null = null
  lastRemove: { id: ExternalId; deleteFiles: boolean } | null = null

  async list(kind?: MediaKind): Promise<LibraryItem[]> {
    this.lastListKind = kind
    return this.listResult
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    this.lastCalendarRange = { start, end }
    return this.calendarResult
  }

  async remove(id: ExternalId, deleteFiles: boolean): Promise<Result<void, ConnectionError>> {
    this.lastRemove = { id, deleteFiles }
    return this.removeResult
  }
}

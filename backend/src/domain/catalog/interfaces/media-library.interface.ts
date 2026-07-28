import type { MediaKind } from '../media-kind.vo.js'
import type { LibraryItem } from '../library-item.entity.js'
import type { CalendarEntry } from '../calendar-entry.entity.js'
import type { ExternalId } from '../external-id.vo.js'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { Result } from '#domain/shared/result'

export interface MediaLibrary {
  /** No `kind` aggregates across all three services. */
  list(kind?: MediaKind): Promise<LibraryItem[]>
  /** Always aggregates across all three services. */
  calendar(start: Date, end: Date): Promise<CalendarEntry[]>
  /** Removes the title from its *arr instance, optionally deleting files on disk. */
  remove(id: ExternalId, deleteFiles: boolean): Promise<Result<void, ConnectionError>>
}

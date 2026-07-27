import type { MediaKind } from '../media-kind.vo.js'
import type { LibraryItem } from '../library-item.entity.js'
import type { CalendarEntry } from '../calendar-entry.entity.js'

export interface MediaLibrary {
  /** No `kind` aggregates across all three services. */
  list(kind?: MediaKind): Promise<LibraryItem[]>
  /** Always aggregates across all three services. */
  calendar(start: Date, end: Date): Promise<CalendarEntry[]>
}

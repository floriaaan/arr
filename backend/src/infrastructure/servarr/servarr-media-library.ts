import { type ServarrRegistry, mediaKindForScheme } from './servarr-registry.js'
import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { LibraryItem } from '#domain/catalog/library-item.entity'
import type { CalendarEntry } from '#domain/catalog/calendar-entry.entity'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import { Result } from '#domain/shared/result'

const ALL_MEDIA_KINDS: readonly MediaKind[] = ['movie', 'series', 'album']

/**
 * Aggregates across instances the same way `ServarrDownloadProgress` does —
 * one *arr instance being down (skipped by `resolveByKind`, or throwing)
 * shouldn't take out the other two, so failures are isolated per kind here
 * rather than propagated.
 */
export class ServarrMediaLibrary implements MediaLibrary {
  constructor(private readonly registry: ServarrRegistry) {}

  async list(kind?: MediaKind): Promise<LibraryItem[]> {
    const kinds = kind ? [kind] : ALL_MEDIA_KINDS
    const items: LibraryItem[] = []
    for (const k of kinds) {
      const adapter = await this.registry.resolveByKind(k)
      if (!adapter) continue
      try {
        items.push(...(await adapter.list()))
      } catch (error) {
        console.error(`[library] failed to list ${k}:`, error)
      }
    }
    return items
  }

  async remove(id: ExternalId, deleteFiles: boolean): Promise<Result<void, ConnectionError>> {
    const kind = mediaKindForScheme(id.scheme)
    const adapter = await this.registry.resolveByKind(kind)
    if (!adapter) {
      return Result.err({
        type: 'unexpected_response',
        message: `No active *arr instance configured for ${kind}`,
      })
    }
    return adapter.remove(id, deleteFiles)
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    const entries: CalendarEntry[] = []
    for (const kind of ALL_MEDIA_KINDS) {
      const adapter = await this.registry.resolveByKind(kind)
      if (!adapter) continue
      try {
        entries.push(...(await adapter.calendar(start, end)))
      } catch (error) {
        console.error(`[calendar] failed to fetch ${kind}:`, error)
      }
    }
    return entries
  }
}

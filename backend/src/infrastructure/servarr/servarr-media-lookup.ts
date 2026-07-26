import { type ServarrRegistry, mediaKindForScheme } from './servarr-registry.js'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'

export class ServarrMediaLookup implements MediaLookup {
  constructor(private readonly registry: ServarrRegistry) {}

  async search(kind: MediaKind, term: string): Promise<MediaItem[]> {
    const adapter = await this.registry.resolveByKind(kind)
    if (!adapter) return []
    return adapter.search(term)
  }

  async detail(id: ExternalId): Promise<MediaDetail> {
    const kind = mediaKindForScheme(id.scheme)
    const adapter = await this.registry.resolveByKind(kind)
    if (!adapter) {
      throw new Error(`No active *arr instance configured for ${kind}`)
    }
    return adapter.detail(id)
  }
}

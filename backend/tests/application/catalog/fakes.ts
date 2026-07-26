import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'

export class FakeMediaLookup implements MediaLookup {
  searchResults: MediaItem[] = []
  detailResult: MediaDetail | null = null
  lastSearch: { kind: MediaKind; term: string } | null = null

  async search(kind: MediaKind, term: string): Promise<MediaItem[]> {
    this.lastSearch = { kind, term }
    return this.searchResults
  }

  async detail(_id: ExternalId): Promise<MediaDetail> {
    if (!this.detailResult) throw new Error('FakeMediaLookup.detailResult was not set')
    return this.detailResult
  }
}

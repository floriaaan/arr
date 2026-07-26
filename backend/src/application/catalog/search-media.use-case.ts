import type { UseCase } from '#application/shared/use-case'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { MediaItem } from '#domain/catalog/media-item.entity'

export interface SearchMediaInput {
  kind: MediaKind
  term: string
}

export class SearchMedia implements UseCase<SearchMediaInput, MediaItem[]> {
  constructor(private readonly lookup: MediaLookup) {}

  async execute(input: SearchMediaInput): Promise<MediaItem[]> {
    return this.lookup.search(input.kind, input.term)
  }
}

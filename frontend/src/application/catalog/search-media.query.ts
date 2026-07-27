import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { MediaItem } from '#domain/catalog/media-item'

export const searchMediaQuery = defineQuery<MediaItem[], [kind: MediaKind, term: string]>({
  key: (kind, term) => ['catalog', 'search', kind, term],
  queryFn: (connector, kind, term) => connector.searchMedia(kind, term),
})

export function useSearchMedia(kind: MediaKind, term: string) {
  return useDomainQuery(searchMediaQuery, [kind, term], { enabled: term.trim().length > 0 })
}

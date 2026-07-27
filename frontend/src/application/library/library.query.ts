import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { LibraryItem } from '#domain/library/library-item'

export const libraryQuery = defineQuery<LibraryItem[], [kind: MediaKind | undefined]>({
  key: (kind) => ['library', kind],
  queryFn: (connector, kind) => connector.listLibrary(kind),
})

export function useLibrary(kind?: MediaKind) {
  return useDomainQuery(libraryQuery, [kind])
}

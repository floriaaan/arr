import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalIdScheme } from '#domain/catalog/external-id'
import type { MediaDetail } from '#domain/catalog/media-detail'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const mediaDetailQuery = defineQuery<
  Result<MediaDetail, ApiError>,
  [scheme: ExternalIdScheme, value: string, kind: MediaKind]
>({
  key: (scheme, value, kind) => ['catalog', 'detail', scheme, value, kind],
  queryFn: (connector, scheme, value, kind) => connector.getMediaDetail(scheme, value, kind),
})

export function useMediaDetail(scheme: ExternalIdScheme, value: string, kind: MediaKind) {
  return useDomainQuery(mediaDetailQuery, [scheme, value, kind])
}

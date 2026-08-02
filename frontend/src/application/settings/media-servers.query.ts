import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { MediaServerDto } from '#domain/settings/media-server'

export const mediaServersQuery = defineQuery<MediaServerDto[], []>({
  key: () => ['media-servers'],
  queryFn: (connector) => connector.listMediaServers(),
})

export function useMediaServers() {
  return useDomainQuery(mediaServersQuery, [])
}

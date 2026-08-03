import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { RequestEpisode } from '#domain/requests/request-episode'

export const requestEpisodesQuery = defineQuery<Result<RequestEpisode[], ApiError>, [string]>({
  key: (id) => ['requests', id, 'episodes'],
  queryFn: (connector, id) => connector.listRequestEpisodes(id),
})

/**
 * `enabled` on purpose: the episode list costs an *arr round-trip, so it is
 * only fetched once the user actually unfolds a request (cf.
 * docs/phase-6-fiabilite-requests, chantier 5 décision 1).
 */
export function useRequestEpisodes(id: string, enabled: boolean) {
  return useDomainQuery(requestEpisodesQuery, [id], { enabled })
}

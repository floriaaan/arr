import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import { ACTIVE_REQUEST_STATUSES } from '#domain/requests/request-filter'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { MediaRequest } from '#domain/requests/media-request'

export const requestsQuery = defineQuery<MediaRequest[], [filter: RequestFilter]>({
  key: (filter) => ['requests', filter],
  queryFn: (connector, filter) => connector.listRequests(filter),
})

/**
 * Polls every 5s while any request is still active — cf. docs/phase-5
 * decision 7. Stops on its own once everything has settled.
 */
export function useRequests(filter: RequestFilter = {}) {
  return useDomainQuery(requestsQuery, [filter], {
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((request) =>
        ACTIVE_REQUEST_STATUSES.includes(request.status),
      )
      return hasActive ? 5_000 : false
    },
  })
}

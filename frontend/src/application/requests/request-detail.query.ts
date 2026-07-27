import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import { ACTIVE_REQUEST_STATUSES } from '#domain/requests/request-filter'
import type { MediaRequest } from '#domain/requests/media-request'

export const requestDetailQuery = defineQuery<MediaRequest | null, [id: string]>({
  key: (id) => ['requests', 'detail', id],
  queryFn: (connector, id) => connector.getRequest(id),
})

export function useRequestDetail(id: string) {
  return useDomainQuery(requestDetailQuery, [id], {
    refetchInterval: (query) =>
      query.state.data && ACTIVE_REQUEST_STATUSES.includes(query.state.data.status) ? 5_000 : false,
  })
}

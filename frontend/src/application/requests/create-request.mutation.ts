import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'
import type { MediaRequest } from '#domain/requests/media-request'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface CreateRequestVariables {
  kind: MediaKind
  externalId: ExternalId
  instanceId?: string
}

export const createRequestMutation = defineMutation<
  Result<MediaRequest, ApiError>,
  CreateRequestVariables
>({
  mutationFn: (connector, { kind, externalId, instanceId }) =>
    connector.createRequest(kind, externalId, instanceId),
})

export function useCreateRequest() {
  return useDomainMutation(createRequestMutation)
}

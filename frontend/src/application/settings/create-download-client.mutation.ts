import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'

export interface CreateDownloadClientVariables {
  kind: ServarrKind
  payload: DownloadClientRecord
}

export const createDownloadClientMutation = defineMutation<
  Result<DownloadClientRecord, ApiError>,
  CreateDownloadClientVariables
>({
  mutationFn: (connector, { kind, payload }) => connector.createDownloadClient(kind, payload),
})

export function useCreateDownloadClient() {
  return useDomainMutation(createDownloadClientMutation)
}

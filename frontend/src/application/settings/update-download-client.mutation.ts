import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'

export interface UpdateDownloadClientVariables {
  kind: ServarrKind
  id: number
  payload: DownloadClientRecord
}

export const updateDownloadClientMutation = defineMutation<
  Result<DownloadClientRecord, ApiError>,
  UpdateDownloadClientVariables
>({
  mutationFn: (connector, { kind, id, payload }) =>
    connector.updateDownloadClient(kind, id, payload),
})

export function useUpdateDownloadClient() {
  return useDomainMutation(updateDownloadClientMutation)
}

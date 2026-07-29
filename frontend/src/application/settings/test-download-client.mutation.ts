import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'

export interface TestDownloadClientVariables {
  kind: ServarrKind
  payload: DownloadClientRecord
}

export const testDownloadClientMutation = defineMutation<
  Result<void, ApiError>,
  TestDownloadClientVariables
>({
  mutationFn: (connector, { kind, payload }) => connector.testDownloadClient(kind, payload),
})

export function useTestDownloadClient() {
  return useDomainMutation(testDownloadClientMutation)
}

import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ConnectionTestResult } from '#domain/interfaces/arr-connector'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export interface TestInstanceVariables {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
}

export const testInstanceMutation = defineMutation<ConnectionTestResult, TestInstanceVariables>({
  mutationFn: (connector, { kind, baseUrl, apiKey }) =>
    connector.testInstanceConnection(kind, baseUrl, apiKey),
})

export function useTestInstance() {
  return useDomainMutation(testInstanceMutation)
}

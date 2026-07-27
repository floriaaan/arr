import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { OidcTestResult } from '#domain/interfaces/arr-connector'

export interface TestOidcVariables {
  issuerUrl: string
  clientId: string
  clientSecret: string
}

export const testOidcMutation = defineMutation<OidcTestResult, TestOidcVariables>({
  mutationFn: (connector, { issuerUrl, clientId, clientSecret }) =>
    connector.testOidcDiscovery(issuerUrl, clientId, clientSecret),
})

export function useTestOidc() {
  return useDomainMutation(testOidcMutation)
}

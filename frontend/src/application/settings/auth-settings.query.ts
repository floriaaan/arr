import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings'

export const effectiveAuthSettingsQuery = defineQuery<EffectiveAuthSettings, []>({
  key: () => ['auth-settings'],
  queryFn: (connector) => connector.getEffectiveAuthSettings(),
})

export function useEffectiveAuthSettings() {
  return useDomainQuery(effectiveAuthSettingsQuery, [])
}

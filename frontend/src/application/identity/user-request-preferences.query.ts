import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'

export const userRequestPreferencesQuery = defineQuery<Record<string, boolean | null>, []>({
  key: () => ['user-request-preferences'],
  queryFn: (connector) => connector.listUserRequestPreferences(),
})

export function useUserRequestPreferences() {
  return useDomainQuery(userRequestPreferencesQuery, [])
}

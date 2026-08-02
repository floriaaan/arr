import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { RequestApprovalSettingsDto } from '#domain/settings/request-approval-settings'

export const requestApprovalSettingsQuery = defineQuery<RequestApprovalSettingsDto, []>({
  key: () => ['request-approval-settings'],
  queryFn: (connector) => connector.getRequestApprovalSettings(),
})

export function useRequestApprovalSettings() {
  return useDomainQuery(requestApprovalSettingsQuery, [])
}

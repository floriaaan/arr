import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { RequestApprovalSettingsDto } from '#domain/settings/request-approval-settings'

export const saveRequestApprovalSettingsMutation = defineMutation<
  RequestApprovalSettingsDto,
  RequestApprovalSettingsDto
>({
  mutationFn: (connector, draft) => connector.saveRequestApprovalSettings(draft),
})

export function useSaveRequestApprovalSettings() {
  return useDomainMutation(saveRequestApprovalSettingsMutation)
}

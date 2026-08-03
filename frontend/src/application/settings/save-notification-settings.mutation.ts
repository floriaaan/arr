import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type {
  NotificationSettingsDraft,
  NotificationSettingsDto,
} from '#domain/settings/notification-settings'

export const saveNotificationSettingsMutation = defineMutation<
  Result<NotificationSettingsDto, ApiError>,
  NotificationSettingsDraft
>({
  mutationFn: (connector, draft) => connector.saveNotificationSettings(draft),
})

export function useSaveNotificationSettings() {
  return useDomainMutation(saveNotificationSettingsMutation)
}

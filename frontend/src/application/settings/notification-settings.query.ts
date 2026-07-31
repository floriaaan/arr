import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { NotificationSettingsDto } from '#domain/settings/notification-settings'

export const notificationSettingsQuery = defineQuery<NotificationSettingsDto, []>({
  key: () => ['notification-settings'],
  queryFn: (connector) => connector.getNotificationSettings(),
})

export function useNotificationSettings() {
  return useDomainQuery(notificationSettingsQuery, [])
}

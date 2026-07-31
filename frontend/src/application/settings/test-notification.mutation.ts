import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { NotificationTestResult } from '#domain/settings/notification-settings'

export const testNotificationMutation = defineMutation<NotificationTestResult, void>({
  mutationFn: (connector) => connector.testNotification(),
})

export function useTestNotification() {
  return useDomainMutation(testNotificationMutation)
}

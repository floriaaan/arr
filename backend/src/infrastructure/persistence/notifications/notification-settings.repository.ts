import NotificationSettingLucidModel from './notification_setting.lucid.js'
import { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import { Url } from '#domain/settings/url.vo'
import { encryptSecret, decryptSecret } from '#infrastructure/shared/encryption'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'

/** Singleton row — the fixed id is the whole enforcement mechanism (cf. `auth-settings.repository.ts`). */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000002'

export class LucidNotificationSettingsRepository implements NotificationSettingsRepository {
  async get(): Promise<NotificationSettings> {
    const row = await NotificationSettingLucidModel.find(SINGLETON_ID)
    if (!row) return NotificationSettings.create(SINGLETON_ID)

    let webhookUrl: Url | null = null
    if (row.webhookUrlEncrypted) {
      const parsed = Url.create(decryptSecret(row.webhookUrlEncrypted))
      if (!parsed.ok)
        throw new Error(`Corrupted notification_settings row: ${parsed.error.message}`)
      webhookUrl = parsed.value
    }

    return NotificationSettings.reconstruct(SINGLETON_ID, {
      webhookUrl,
      onRequestAvailable: row.onRequestAvailable,
      onRequestFailed: row.onRequestFailed,
      onInstanceUnreachable: row.onInstanceUnreachable,
    })
  }

  async save(settings: NotificationSettings): Promise<void> {
    const model =
      (await NotificationSettingLucidModel.find(SINGLETON_ID)) ??
      new NotificationSettingLucidModel()
    model.id = SINGLETON_ID
    model.webhookUrlEncrypted = settings.webhookUrl
      ? encryptSecret(settings.webhookUrl.value)
      : null
    model.onRequestAvailable = settings.onRequestAvailable
    model.onRequestFailed = settings.onRequestFailed
    model.onInstanceUnreachable = settings.onInstanceUnreachable
    await model.save()
  }
}

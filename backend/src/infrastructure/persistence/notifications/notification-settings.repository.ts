import NotificationSettingLucidModel from './notification_setting.lucid.js'
import { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import { NotificationAuth } from '#domain/notifications/notification-auth.vo'
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
      auth: this.reconstructAuth(row),
      onRequestAvailable: row.onRequestAvailable,
      onRequestFailed: row.onRequestFailed,
      onInstanceUnreachable: row.onInstanceUnreachable,
    })
  }

  private reconstructAuth(row: NotificationSettingLucidModel): NotificationAuth {
    if (row.authMode === 'token' && row.tokenEncrypted) {
      const token = NotificationAuth.token(decryptSecret(row.tokenEncrypted))
      if (!token.ok) throw new Error(`Corrupted notification_settings row: ${token.error.message}`)
      return token.value
    }
    if (row.authMode === 'basic' && row.username && row.passwordEncrypted) {
      const basic = NotificationAuth.basic(row.username, decryptSecret(row.passwordEncrypted))
      if (!basic.ok) throw new Error(`Corrupted notification_settings row: ${basic.error.message}`)
      return basic.value
    }
    return NotificationAuth.none()
  }

  async save(settings: NotificationSettings): Promise<void> {
    const model =
      (await NotificationSettingLucidModel.find(SINGLETON_ID)) ??
      new NotificationSettingLucidModel()
    model.id = SINGLETON_ID
    model.webhookUrlEncrypted = settings.webhookUrl
      ? encryptSecret(settings.webhookUrl.value)
      : null
    model.authMode = settings.auth.mode
    model.tokenEncrypted = settings.auth.token ? encryptSecret(settings.auth.token.reveal()) : null
    model.username = settings.auth.username
    model.passwordEncrypted = settings.auth.password
      ? encryptSecret(settings.auth.password.reveal())
      : null
    model.onRequestAvailable = settings.onRequestAvailable
    model.onRequestFailed = settings.onRequestFailed
    model.onInstanceUnreachable = settings.onInstanceUnreachable
    await model.save()
  }
}

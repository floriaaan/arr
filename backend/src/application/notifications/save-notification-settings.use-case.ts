import { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { NotificationAuth } from '#domain/notifications/notification-auth.vo'
import type { UseCase } from '#application/shared/use-case'
import type { NotificationSettingsRepository } from '#domain/notifications/interfaces/notification-settings-repository.interface'
import type { NotificationSettings } from '#domain/notifications/notification-settings.aggregate'
import type { ValidationError } from '#domain/shared/validation-error'

export interface SaveNotificationSettingsInput {
  /** `null` clears it; `undefined` keeps the stored one (it never travels back to the client). */
  webhookUrl?: string | null
  authMode: 'none' | 'token' | 'basic'
  /** Only read when `authMode` is `'token'`. `undefined` keeps the stored token. */
  token?: string
  /** Only read when `authMode` is `'basic'`. `undefined` keeps the stored username. */
  username?: string
  /** Only read when `authMode` is `'basic'`. `undefined` keeps the stored password. */
  password?: string
  onRequestCreated: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}

export class SaveNotificationSettings implements UseCase<
  SaveNotificationSettingsInput,
  Result<NotificationSettings, ValidationError>
> {
  constructor(private readonly repository: NotificationSettingsRepository) {}

  async execute(
    input: SaveNotificationSettingsInput,
  ): Promise<Result<NotificationSettings, ValidationError>> {
    const settings = await this.repository.get()

    let webhookUrl = settings.webhookUrl
    if (input.webhookUrl === null) {
      webhookUrl = null
    } else if (input.webhookUrl !== undefined) {
      const parsed = Url.create(input.webhookUrl)
      if (!parsed.ok) return parsed
      webhookUrl = parsed.value
    }

    const auth = this.resolveAuth(input, settings.auth)
    if (!auth.ok) return auth

    settings.configure({
      webhookUrl,
      auth: auth.value,
      onRequestCreated: input.onRequestCreated,
      onRequestAvailable: input.onRequestAvailable,
      onRequestFailed: input.onRequestFailed,
      onInstanceUnreachable: input.onInstanceUnreachable,
    })
    await this.repository.save(settings)
    return Result.ok(settings)
  }

  /**
   * `token`/`password` are write tokens, same treatment as `webhookUrl`:
   * omitting them keeps whatever is already stored, as long as the mode
   * being kept or switched to actually matches what was already stored —
   * otherwise there is nothing to fall back on and it's a validation error.
   */
  private resolveAuth(
    input: SaveNotificationSettingsInput,
    existing: NotificationAuth,
  ): Result<NotificationAuth, ValidationError> {
    if (input.authMode === 'none') return Result.ok(NotificationAuth.none())

    if (input.authMode === 'token') {
      if (input.token !== undefined) return NotificationAuth.token(input.token)
      if (existing.mode === 'token') return Result.ok(existing)
      return Result.err({ field: 'token', message: 'A token is required.' })
    }

    const username = input.username ?? (existing.mode === 'basic' ? existing.username : null)
    if (!username || username.trim().length === 0) {
      return Result.err({ field: 'username', message: 'Username must not be empty' })
    }
    if (input.password !== undefined) return NotificationAuth.basic(username, input.password)
    if (existing.mode === 'basic' && existing.password) {
      return NotificationAuth.basic(username, existing.password.reveal())
    }
    return Result.err({ field: 'password', message: 'A password is required.' })
  }
}

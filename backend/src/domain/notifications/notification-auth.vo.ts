import { ValueObject } from '#domain/shared/value-object'
import { Result } from '#domain/shared/result'
import { ApiKey } from '#domain/settings/api-key.vo'
import type { ValidationError } from '#domain/shared/validation-error'

export type NotificationAuthMode = 'none' | 'token' | 'basic'

interface NotificationAuthProps {
  mode: NotificationAuthMode
  token: ApiKey | null
  username: string | null
  password: ApiKey | null
}

/**
 * Optional credentials sent with every webhook POST — mainly for a
 * self-hosted ntfy topic behind access control: `token` becomes
 * `Authorization: Bearer <token>` (ntfy token auth), `username`/`password`
 * become `Authorization: Basic ...` (ntfy user auth, also what a Gotify
 * behind basic-auth expects). Discord and an open ntfy topic just use `none`.
 */
export class NotificationAuth extends ValueObject<NotificationAuthProps> {
  private constructor(props: NotificationAuthProps) {
    super(props)
  }

  static none(): NotificationAuth {
    return new NotificationAuth({ mode: 'none', token: null, username: null, password: null })
  }

  static token(raw: string): Result<NotificationAuth, ValidationError> {
    const token = ApiKey.create(raw)
    if (!token.ok) return Result.err({ field: 'token', message: token.error.message })
    return Result.ok(
      new NotificationAuth({ mode: 'token', token: token.value, username: null, password: null }),
    )
  }

  static basic(username: string, rawPassword: string): Result<NotificationAuth, ValidationError> {
    if (username.trim().length === 0) {
      return Result.err({ field: 'username', message: 'Username must not be empty' })
    }
    const password = ApiKey.create(rawPassword)
    if (!password.ok) return Result.err({ field: 'password', message: password.error.message })
    return Result.ok(
      new NotificationAuth({ mode: 'basic', token: null, username, password: password.value }),
    )
  }

  static reconstruct(props: NotificationAuthProps): NotificationAuth {
    return new NotificationAuth(props)
  }

  get mode(): NotificationAuthMode {
    return this.props.mode
  }

  get token(): ApiKey | null {
    return this.props.token
  }

  get username(): string | null {
    return this.props.username
  }

  get password(): ApiKey | null {
    return this.props.password
  }

  /** `null` when `mode` is `'none'`, or a credential is somehow missing. */
  authorizationHeader(): string | null {
    if (this.props.mode === 'token' && this.props.token) {
      return `Bearer ${this.props.token.reveal()}`
    }
    if (this.props.mode === 'basic' && this.props.username && this.props.password) {
      const encoded = Buffer.from(
        `${this.props.username}:${this.props.password.reveal()}`,
      ).toString('base64')
      return `Basic ${encoded}`
    }
    return null
  }
}

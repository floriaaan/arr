import { AggregateRoot } from '#domain/shared/aggregate-root'
import { NotificationAuth } from './notification-auth.vo.js'
import type { Url } from '#domain/settings/url.vo'

export interface NotificationSettingsProps {
  /** `null` disables every channel — there is nowhere to send. */
  webhookUrl: Url | null
  /** Credentials sent with the webhook request — `NotificationAuth.none()` by default. */
  auth: NotificationAuth
  onRequestCreated: boolean
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
  onRequestPendingApproval: boolean
}

/**
 * Single-row settings, same shape as `AuthSettings`. Note what is *not* here:
 * a switch for `RequestProgressed`. Notifying on progress would fire every 10
 * seconds for the whole life of a download (cf.
 * docs/phase-6-fiabilite-requests/02, chantier 2 décision 2).
 */
export class NotificationSettings extends AggregateRoot<string> {
  private props: NotificationSettingsProps

  private constructor(id: string, props: NotificationSettingsProps) {
    super(id)
    this.props = props
  }

  /** Defaults for an instance that never configured anything: nothing to send, everything on. */
  static create(id: string): NotificationSettings {
    return new NotificationSettings(id, {
      webhookUrl: null,
      auth: NotificationAuth.none(),
      onRequestCreated: true,
      onRequestAvailable: true,
      onRequestFailed: true,
      onInstanceUnreachable: true,
      onRequestPendingApproval: true,
    })
  }

  static reconstruct(id: string, props: NotificationSettingsProps): NotificationSettings {
    return new NotificationSettings(id, props)
  }

  get webhookUrl(): Url | null {
    return this.props.webhookUrl
  }

  get auth(): NotificationAuth {
    return this.props.auth
  }

  get onRequestCreated(): boolean {
    return this.props.onRequestCreated
  }

  get onRequestAvailable(): boolean {
    return this.props.onRequestAvailable
  }

  get onRequestFailed(): boolean {
    return this.props.onRequestFailed
  }

  get onInstanceUnreachable(): boolean {
    return this.props.onInstanceUnreachable
  }

  get onRequestPendingApproval(): boolean {
    return this.props.onRequestPendingApproval
  }

  configure(props: NotificationSettingsProps): void {
    this.props = props
  }
}

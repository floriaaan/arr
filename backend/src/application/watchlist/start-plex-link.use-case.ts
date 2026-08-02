import type { UseCase } from '#application/shared/use-case'
import type {
  PlexLinkProvider,
  PlexPin,
} from '#domain/watchlist/interfaces/plex-link-provider.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { Result } from '#domain/shared/result'

export interface StartPlexLinkOutput {
  pin: PlexPin
  authUrl: string
}

/** No DB write — the pin is ephemeral, held by the client until `CompletePlexLink` polls it. */
export class StartPlexLink implements UseCase<void, Result<StartPlexLinkOutput, ConnectionError>> {
  constructor(private readonly plex: PlexLinkProvider) {}

  async execute(): Promise<Result<StartPlexLinkOutput, ConnectionError>> {
    const pin = await this.plex.createPin()
    if (!pin.ok) return pin
    return { ok: true, value: { pin: pin.value, authUrl: this.plex.authUrl(pin.value) } }
  }
}

import { fetchJson, classifyWatchlistError } from './http.js'
import { Result } from '#domain/shared/result'
import { ExternalId } from '#domain/catalog/external-id.vo'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { WatchlistItem } from '#domain/watchlist/watchlist-item.vo'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { WatchlistProvider } from '#domain/watchlist/interfaces/watchlist-provider.interface'
import type {
  PlexLinkProvider,
  PlexPin,
  PlexLinkedUser,
} from '#domain/watchlist/interfaces/plex-link-provider.interface'

const PLEX_PRODUCT = 'arr'
const PLEX_VERSION = '1.0.0'
/** Fixed on purpose — this identifies *the app*, not a link session; only the PIN flow needs a fresh one. */
const APP_CLIENT_IDENTIFIER = 'arr-watchlist-sync'

interface PlexWatchlistGuid {
  id: string
}

interface PlexWatchlistMetadata {
  type: string
  title: string
  Guid?: PlexWatchlistGuid[]
}

const SCHEME_BY_PLEX_TYPE: Record<string, Extract<ExternalIdScheme, 'tmdb' | 'tvdb'>> = {
  movie: 'tmdb',
  show: 'tvdb',
}

function plexHeaders(clientIdentifier: string, token?: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'X-Plex-Product': PLEX_PRODUCT,
    'X-Plex-Version': PLEX_VERSION,
    'X-Plex-Client-Identifier': clientIdentifier,
    ...(token ? { 'X-Plex-Token': token } : {}),
  }
}

/**
 * PIN-based OAuth device flow (`plex.tv/api/v2/pins`) for linking, plus the
 * Discover watchlist endpoint for syncing — the backend never sees a Plex
 * password (cf. docs/phase-7-watchlist-sync, chantier 2 décision 2). Moderate
 * confidence: undocumented but stable endpoints, the same ones
 * Overseerr/Jellyseerr rely on.
 */
export class PlexClient implements WatchlistProvider, PlexLinkProvider {
  async createPin(): Promise<Result<PlexPin, ConnectionError>> {
    const clientIdentifier = crypto.randomUUID()
    try {
      const raw = (await fetchJson('https://plex.tv/api/v2/pins?strong=true', {
        method: 'POST',
        headers: plexHeaders(clientIdentifier),
      })) as { id: number; code: string }
      return Result.ok({ id: raw.id, code: raw.code, clientIdentifier })
    } catch (error) {
      return Result.err(classifyWatchlistError(error))
    }
  }

  authUrl(pin: PlexPin): string {
    const qs = new URLSearchParams({
      clientID: pin.clientIdentifier,
      code: pin.code,
      'context[device][product]': PLEX_PRODUCT,
    })
    return `https://app.plex.tv/auth#?${qs.toString()}`
  }

  /** `Result.ok(null)` while the user hasn't finished authorizing in their browser yet — not an error. */
  async pollPin(pin: PlexPin): Promise<Result<string | null, ConnectionError>> {
    try {
      const raw = (await fetchJson(`https://plex.tv/api/v2/pins/${pin.id}`, {
        headers: plexHeaders(pin.clientIdentifier),
      })) as { authToken: string | null }
      return Result.ok(raw.authToken)
    } catch (error) {
      return Result.err(classifyWatchlistError(error))
    }
  }

  async fetchUser(
    pin: PlexPin,
    authToken: string,
  ): Promise<Result<PlexLinkedUser, ConnectionError>> {
    try {
      const raw = (await fetchJson('https://plex.tv/api/v2/user', {
        headers: plexHeaders(pin.clientIdentifier, authToken),
      })) as { id: number; username: string }
      return Result.ok({ id: String(raw.id), username: raw.username })
    } catch (error) {
      return Result.err(classifyWatchlistError(error))
    }
  }

  /**
   * Items carry a `Guid[]` with entries like `tmdb://603`; only `tmdb`
   * (movie) / `tvdb` (show) are kept — an `imdb://` guid is dropped, this
   * app has no `imdb` `ExternalIdScheme` (cf. chantier 3 décision 2). An
   * item with no usable guid is skipped, not fatal to the rest of the run.
   */
  async fetchItems(account: UserMediaAccount): Promise<WatchlistItem[]> {
    const raw = (await fetchJson(
      'https://discover.provider.plex.tv/library/sections/watchlist/all?includeGuids=1',
      { headers: plexHeaders(APP_CLIENT_IDENTIFIER, account.accessToken) },
    )) as { MediaContainer?: { Metadata?: PlexWatchlistMetadata[] } }

    const items: WatchlistItem[] = []
    for (const entry of raw.MediaContainer?.Metadata ?? []) {
      const scheme = SCHEME_BY_PLEX_TYPE[entry.type]
      if (!scheme) continue

      const guid = (entry.Guid ?? []).find((candidate) => candidate.id.startsWith(`${scheme}://`))
      if (!guid) continue

      const value = guid.id.slice(`${scheme}://`.length)
      const externalId = ExternalId.create(scheme, value)
      if (!externalId.ok) continue

      items.push({
        kind: scheme === 'tmdb' ? 'movie' : 'series',
        externalId: externalId.value,
        title: entry.title,
      })
    }
    return items
  }
}

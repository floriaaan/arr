import { fetchJson, classifyWatchlistError } from './http.js'
import { Result } from '#domain/shared/result'
import { ExternalId } from '#domain/catalog/external-id.vo'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { WatchlistItem } from '#domain/watchlist/watchlist-item.vo'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { WatchlistProvider } from '#domain/watchlist/interfaces/watchlist-provider.interface'
import type {
  MediaServerAuthProvider,
  MediaServerAuthResult,
} from '#domain/watchlist/interfaces/media-server-auth-provider.interface'

const DEVICE_ID = 'arr-watchlist-sync'
const CLIENT_VERSION = '1.0.0'

interface AuthenticateResponse {
  User: { Id: string; Name: string }
  AccessToken: string
}

interface JellyfinLikeItem {
  Type: string
  Name: string
  ProviderIds?: Record<string, string>
}

const SCHEME_BY_ITEM_TYPE: Record<string, Extract<ExternalIdScheme, 'tmdb' | 'tvdb'>> = {
  Movie: 'tmdb',
  Series: 'tvdb',
}

/**
 * Jellyfin and Emby share the same MediaBrowser-derived API (Emby is the
 * fork Jellyfin was forked from) — one client, parameterized by the `/emby`
 * path prefix and the `authScheme` label the two diverged on for the
 * `X-Emby-Authorization` header value (cf. docs/phase-7-watchlist-sync,
 * chantier 1 et 3).
 */
export class JellyfinLikeClient implements WatchlistProvider, MediaServerAuthProvider {
  constructor(
    private readonly pathPrefix: '' | '/emby',
    private readonly authScheme: 'MediaBrowser' | 'Emby',
  ) {}

  private authorizationHeader(token?: string): string {
    const parts = [
      `Client="arr"`,
      `Device="arr"`,
      `DeviceId="${DEVICE_ID}"`,
      `Version="${CLIENT_VERSION}"`,
      ...(token ? [`Token="${token}"`] : []),
    ]
    return `${this.authScheme} ${parts.join(', ')}`
  }

  async authenticate(
    baseUrl: string,
    username: string,
    password: string,
  ): Promise<Result<MediaServerAuthResult, ConnectionError>> {
    try {
      const raw = (await fetchJson(`${baseUrl}${this.pathPrefix}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Emby-Authorization': this.authorizationHeader(),
        },
        body: JSON.stringify({ Username: username, Pw: password }),
      })) as AuthenticateResponse
      return Result.ok({
        externalUserId: raw.User.Id,
        username: raw.User.Name,
        accessToken: raw.AccessToken,
      })
    } catch (error) {
      return Result.err(classifyWatchlistError(error))
    }
  }

  /**
   * "Watchlist" here is Favorites (`IsFavorite`) — neither server has a
   * Plex-style cloud watchlist, this is the closest local equivalent (cf.
   * chantier 1 décision 1).
   */
  async fetchItems(account: UserMediaAccount): Promise<WatchlistItem[]> {
    if (!account.baseUrl) throw new Error('Jellyfin/Emby account is missing its server base URL')

    const qs = new URLSearchParams({
      Filters: 'IsFavorite',
      IncludeItemTypes: 'Movie,Series',
      Recursive: 'true',
    })
    const raw = (await fetchJson(
      `${account.baseUrl}${this.pathPrefix}/Users/${account.externalUserId}/Items?${qs.toString()}`,
      { headers: { Accept: 'application/json', 'X-Emby-Token': account.accessToken } },
    )) as { Items?: JellyfinLikeItem[] }

    const items: WatchlistItem[] = []
    for (const entry of raw.Items ?? []) {
      const scheme = SCHEME_BY_ITEM_TYPE[entry.Type]
      if (!scheme) continue

      const providerKey = scheme === 'tmdb' ? 'Tmdb' : 'Tvdb'
      const value = entry.ProviderIds?.[providerKey]
      if (!value) continue

      const externalId = ExternalId.create(scheme, value)
      if (!externalId.ok) continue

      items.push({
        kind: scheme === 'tmdb' ? 'movie' : 'series',
        externalId: externalId.value,
        title: entry.Name,
      })
    }
    return items
  }
}

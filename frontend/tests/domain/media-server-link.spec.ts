import { describe, test, expect } from 'vitest'
import { buildMediaServerSearchUrl } from '#domain/settings/media-server-link'
import type { MediaServerDto, MediaServerKind } from '#domain/settings/media-server'

function aServer(kind: MediaServerKind, baseUrl: string): MediaServerDto {
  return { id: `${kind}-1`, kind, baseUrl, enabled: true }
}

describe('buildMediaServerSearchUrl', () => {
  test('points Plex at its own web client search route', () => {
    const url = buildMediaServerSearchUrl(aServer('plex', 'http://plex.local:32400'), 'Fight Club')

    expect(url).toBe('http://plex.local:32400/web/index.html#!/search?query=Fight%20Club')
  })

  test('points Jellyfin and Emby at the shared search.html route', () => {
    const jellyfin = buildMediaServerSearchUrl(
      aServer('jellyfin', 'http://jellyfin.local:8096'),
      'Severance',
    )
    const emby = buildMediaServerSearchUrl(aServer('emby', 'http://emby.local:8096'), 'Severance')

    expect(jellyfin).toBe('http://jellyfin.local:8096/web/index.html#!/search.html?query=Severance')
    expect(emby).toBe('http://emby.local:8096/web/index.html#!/search.html?query=Severance')
  })

  test('tolerates a trailing slash on the stored base url', () => {
    const url = buildMediaServerSearchUrl(aServer('plex', 'http://plex.local:32400//'), 'Dune')

    expect(url).toBe('http://plex.local:32400/web/index.html#!/search?query=Dune')
  })

  test('encodes titles that would otherwise break the query string', () => {
    const url = buildMediaServerSearchUrl(
      aServer('jellyfin', 'http://jellyfin.local:8096'),
      'Fast & Furious: Tokyo Drift?',
    )

    expect(url).toBe(
      'http://jellyfin.local:8096/web/index.html#!/search.html?query=Fast%20%26%20Furious%3A%20Tokyo%20Drift%3F',
    )
  })
})

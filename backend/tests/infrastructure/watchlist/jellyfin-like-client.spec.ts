import { test } from '@japa/runner'
import { JellyfinLikeClient } from '#infrastructure/watchlist/jellyfin-like-client'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'

function stubFetch(handler: (url: string, init: RequestInit | undefined) => unknown) {
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init?: RequestInit) =>
    new Response(JSON.stringify(handler(url.toString(), init)), {
      status: 200,
    })) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function aJellyfinAccount() {
  return UserMediaAccount.link(
    '1',
    {
      userId: 'user-1',
      kind: 'jellyfin',
      externalUserId: 'jf-user-1',
      username: 'alice',
      accessToken: 'tok_abc',
      baseUrl: 'http://jellyfin.local:8096',
    },
    new Date(),
  )
}

test.group('JellyfinLikeClient — fetchItems (Favorites)', () => {
  test('normalizes movies/series from ProviderIds, without the /emby prefix', async ({
    assert,
    cleanup,
  }) => {
    const calls: string[] = []
    cleanup(
      stubFetch((url) => {
        calls.push(url)
        return {
          Items: [
            { Type: 'Movie', Name: 'Fight Club', ProviderIds: { Tmdb: '550', Imdb: 'tt0137523' } },
            { Type: 'Series', Name: 'Severance', ProviderIds: { Tvdb: '371980' } },
          ],
        }
      }),
    )

    const items = await new JellyfinLikeClient('', 'MediaBrowser').fetchItems(aJellyfinAccount())

    assert.lengthOf(items, 2)
    assert.equal(items[0]?.externalId.scheme, 'tmdb')
    assert.equal(items[1]?.externalId.scheme, 'tvdb')
    assert.include(calls[0], 'http://jellyfin.local:8096/Users/jf-user-1/Items')
    assert.notInclude(calls[0], '/emby/')
  })

  test('Emby variant hits the /emby prefix', async ({ assert, cleanup }) => {
    const calls: string[] = []
    cleanup(
      stubFetch((url) => {
        calls.push(url)
        return { Items: [] }
      }),
    )

    await new JellyfinLikeClient('/emby', 'Emby').fetchItems(aJellyfinAccount())

    assert.include(calls[0], '/emby/Users/jf-user-1/Items')
  })

  test('skips an item missing the matching provider id', async ({ assert, cleanup }) => {
    cleanup(
      stubFetch(() => ({
        Items: [{ Type: 'Movie', Name: 'No tmdb id', ProviderIds: { Imdb: 'tt0000000' } }],
      })),
    )

    const items = await new JellyfinLikeClient('', 'MediaBrowser').fetchItems(aJellyfinAccount())

    assert.lengthOf(items, 0)
  })
})

test.group('JellyfinLikeClient — authenticate', () => {
  test('sends the MediaBrowser authorization header and parses the response', async ({
    assert,
    cleanup,
  }) => {
    let capturedHeaders: RequestInit['headers']
    cleanup(
      stubFetch((_url, init) => {
        capturedHeaders = init?.headers
        return { User: { Id: 'jf-user-1', Name: 'alice' }, AccessToken: 'tok_xyz' }
      }),
    )

    const result = await new JellyfinLikeClient('', 'MediaBrowser').authenticate(
      'http://jellyfin.local:8096',
      'alice',
      'hunter2',
    )

    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.externalUserId, 'jf-user-1')
      assert.equal(result.value.accessToken, 'tok_xyz')
    }
    assert.include(
      (capturedHeaders as Record<string, string>)?.['X-Emby-Authorization'] ?? '',
      'MediaBrowser',
    )
  })
})

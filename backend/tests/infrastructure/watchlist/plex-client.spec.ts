import { test } from '@japa/runner'
import { PlexClient } from '#infrastructure/watchlist/plex-client'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'

function stubFetch(body: unknown) {
  const original = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status: 200 })) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function aPlexAccount() {
  return UserMediaAccount.link(
    '1',
    {
      userId: 'user-1',
      kind: 'plex',
      externalUserId: 'plex-42',
      username: 'alice',
      accessToken: 'tok_abc',
      baseUrl: null,
    },
    new Date(),
  )
}

test.group('PlexClient — fetchItems', () => {
  test('normalizes a movie and a show to tmdb/tvdb', async ({ assert, cleanup }) => {
    cleanup(
      stubFetch({
        MediaContainer: {
          Metadata: [
            {
              type: 'movie',
              title: 'Fight Club',
              Guid: [{ id: 'imdb://tt0137523' }, { id: 'tmdb://550' }],
            },
            {
              type: 'show',
              title: 'Severance',
              Guid: [{ id: 'tvdb://371980' }],
            },
          ],
        },
      }),
    )

    const items = await new PlexClient().fetchItems(aPlexAccount())

    assert.lengthOf(items, 2)
    assert.equal(items[0]?.kind, 'movie')
    assert.equal(items[0]?.externalId.scheme, 'tmdb')
    assert.equal(items[0]?.externalId.value, '550')
    assert.equal(items[1]?.kind, 'series')
    assert.equal(items[1]?.externalId.scheme, 'tvdb')
    assert.equal(items[1]?.externalId.value, '371980')
  })

  test('skips an item with no usable guid', async ({ assert, cleanup }) => {
    cleanup(
      stubFetch({
        MediaContainer: {
          Metadata: [
            { type: 'movie', title: 'No guid here', Guid: [{ id: 'imdb://tt0000000' }] },
            { type: 'movie', title: 'Fight Club', Guid: [{ id: 'tmdb://550' }] },
          ],
        },
      }),
    )

    const items = await new PlexClient().fetchItems(aPlexAccount())

    assert.lengthOf(items, 1)
    assert.equal(items[0]?.title, 'Fight Club')
  })

  test('skips an unknown media type (e.g. music)', async ({ assert, cleanup }) => {
    cleanup(
      stubFetch({
        MediaContainer: {
          Metadata: [{ type: 'artist', title: 'Some Band', Guid: [{ id: 'tmdb://1' }] }],
        },
      }),
    )

    const items = await new PlexClient().fetchItems(aPlexAccount())

    assert.lengthOf(items, 0)
  })
})

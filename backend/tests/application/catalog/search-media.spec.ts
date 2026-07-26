import { test } from '@japa/runner'
import { SearchMedia } from '#application/catalog/search-media.use-case'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'
import { FakeMediaLookup } from './fakes.js'

test.group('SearchMedia', () => {
  test('delegates the search to MediaLookup and returns its results', async ({ assert }) => {
    const lookup = new FakeMediaLookup()
    const externalId = ExternalId.create('tmdb', '550')
    if (!externalId.ok) throw new Error('unreachable')

    lookup.searchResults = [
      MediaItem.create(externalId.value, {
        kind: 'movie',
        title: 'Fight Club',
        year: 1999,
        overview: '',
        posterRef: null,
        alreadyManaged: false,
      }),
    ]

    const result = await new SearchMedia(lookup).execute({ kind: 'movie', term: 'fight club' })

    assert.lengthOf(result, 1)
    assert.deepEqual(lookup.lastSearch, { kind: 'movie', term: 'fight club' })
  })
})

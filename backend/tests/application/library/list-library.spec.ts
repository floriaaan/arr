import { test } from '@japa/runner'
import { ListLibrary } from '#application/library/list-library.use-case'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { LibraryItem } from '#domain/catalog/library-item.entity'
import { FakeMediaLibrary } from './fakes.js'

test.group('ListLibrary', () => {
  test('delegates to MediaLibrary and returns its results', async ({ assert }) => {
    const library = new FakeMediaLibrary()
    const externalId = ExternalId.create('tmdb', '550')
    if (!externalId.ok) throw new Error('unreachable')

    library.listResult = [
      LibraryItem.create(externalId.value, {
        kind: 'movie',
        title: 'Fight Club',
        year: 1999,
        posterRef: null,
        monitored: true,
        hasFile: true,
        sizeOnDiskBytes: 4_000_000_000,
        status: 'downloaded',
        instanceId: 'radarr-1',
      }),
    ]

    const result = await new ListLibrary(library).execute({ kind: 'movie' })

    assert.lengthOf(result, 1)
    assert.equal(library.lastListKind, 'movie')
  })

  test('with no kind, asks MediaLibrary to aggregate across services', async ({ assert }) => {
    const library = new FakeMediaLibrary()
    await new ListLibrary(library).execute({})
    assert.isUndefined(library.lastListKind)
  })
})

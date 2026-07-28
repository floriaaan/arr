import { test } from '@japa/runner'
import { RemoveLibraryItem } from '#application/library/remove-library-item.use-case'
import { Result } from '#domain/shared/result'
import { FakeMediaLibrary } from './fakes.js'

test.group('RemoveLibraryItem', () => {
  test('delegates to MediaLibrary with the parsed external id', async ({ assert }) => {
    const library = new FakeMediaLibrary()

    const result = await new RemoveLibraryItem(library).execute({
      scheme: 'tmdb',
      value: '550',
      deleteFiles: true,
    })

    assert.isTrue(result.ok)
    assert.equal(library.lastRemove?.id.format(), 'tmdb:550')
    assert.isTrue(library.lastRemove?.deleteFiles)
  })

  test('rejects an empty external id value before reaching MediaLibrary', async ({ assert }) => {
    const library = new FakeMediaLibrary()

    const result = await new RemoveLibraryItem(library).execute({
      scheme: 'tmdb',
      value: '',
      deleteFiles: false,
    })

    assert.isFalse(result.ok)
    assert.isNull(library.lastRemove)
  })

  test('surfaces a MediaLibrary failure', async ({ assert }) => {
    const library = new FakeMediaLibrary()
    library.removeResult = Result.err({ type: 'unauthorized', message: 'nope' })

    const result = await new RemoveLibraryItem(library).execute({
      scheme: 'tvdb',
      value: '123',
      deleteFiles: false,
    })

    assert.isFalse(result.ok)
    if (!result.ok && 'type' in result.error) assert.equal(result.error.type, 'unauthorized')
  })
})

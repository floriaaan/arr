import { test } from '@japa/runner'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'

function anExternalId(value = '550') {
  const result = ExternalId.create('tmdb', value)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('MediaItem', () => {
  test('two items with equal external ids are equal, even as different instances', ({ assert }) => {
    const a = MediaItem.create(anExternalId(), {
      kind: 'movie',
      title: 'Fight Club',
      year: 1999,
      overview: '',
      posterRef: null,
      alreadyManaged: false,
    })
    const b = MediaItem.create(anExternalId(), {
      kind: 'movie',
      title: 'Fight Club',
      year: 1999,
      overview: '',
      posterRef: null,
      alreadyManaged: false,
    })

    assert.isTrue(a.equals(b))
  })

  test('items with different external ids are not equal', ({ assert }) => {
    const a = MediaItem.create(anExternalId('550'), {
      kind: 'movie',
      title: 'Fight Club',
      year: 1999,
      overview: '',
      posterRef: null,
      alreadyManaged: false,
    })
    const b = MediaItem.create(anExternalId('551'), {
      kind: 'movie',
      title: 'Other',
      year: 2000,
      overview: '',
      posterRef: null,
      alreadyManaged: false,
    })

    assert.isFalse(a.equals(b))
  })
})

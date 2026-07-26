import { test } from '@japa/runner'
import { GetMediaDetail } from '#application/catalog/get-media-detail.use-case'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { FakeMediaLookup } from './fakes.js'

test.group('GetMediaDetail', () => {
  test('rejects an empty value before calling MediaLookup', async ({ assert }) => {
    const lookup = new FakeMediaLookup()
    const result = await new GetMediaDetail(lookup).execute({ scheme: 'tmdb', value: '' })

    assert.isFalse(result.ok)
  })

  test('returns the detail from MediaLookup on success', async ({ assert }) => {
    const lookup = new FakeMediaLookup()
    const externalId = ExternalId.create('tmdb', '550')
    if (!externalId.ok) throw new Error('unreachable')

    lookup.detailResult = MediaDetail.create(externalId.value, {
      kind: 'movie',
      title: 'Fight Club',
      year: 1999,
      overview: '',
      posterRef: null,
      alreadyManaged: false,
      genres: ['Drama'],
    })

    const result = await new GetMediaDetail(lookup).execute({ scheme: 'tmdb', value: '550' })

    assert.isTrue(result.ok)
    assert.equal(result.ok ? result.value.title : undefined, 'Fight Club')
  })
})

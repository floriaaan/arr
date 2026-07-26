import { test } from '@japa/runner'
import { ExternalId } from '#domain/catalog/external-id.vo'

test.group('ExternalId', () => {
  test('create() builds a valid id', ({ assert }) => {
    const result = ExternalId.create('tmdb', '550')
    assert.isTrue(result.ok)
  })

  test('format() renders as "scheme:value"', ({ assert }) => {
    const result = ExternalId.create('tmdb', '550')
    if (!result.ok) throw new Error('unreachable')
    assert.equal(result.value.format(), 'tmdb:550')
  })

  test('parse() accepts a well-formed "scheme:value" string', ({ assert }) => {
    const result = ExternalId.parse('tvdb:81189')
    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.scheme, 'tvdb')
      assert.equal(result.value.value, '81189')
    }
  })

  test('parse() rejects an unknown scheme', ({ assert }) => {
    const result = ExternalId.parse('imdb:tt0137523')
    assert.isFalse(result.ok)
  })

  test('parse() rejects a string without a colon', ({ assert }) => {
    const result = ExternalId.parse('550')
    assert.isFalse(result.ok)
  })

  test('two ids with the same scheme and value are equal', ({ assert }) => {
    const a = ExternalId.create('tmdb', '550')
    const b = ExternalId.create('tmdb', '550')
    assert.isTrue(a.ok && b.ok && a.value.equals(b.value))
  })
})

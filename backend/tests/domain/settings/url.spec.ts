import { test } from '@japa/runner'
import { Url } from '#domain/settings/url.vo'

test.group('Url', () => {
  test('accepts an http(s) URL', ({ assert }) => {
    const result = Url.create('http://radarr.local:7878')
    assert.isTrue(result.ok)
  })

  test('strips a trailing slash for consistent storage', ({ assert }) => {
    const result = Url.create('http://radarr.local:7878/')
    assert.isTrue(result.ok && result.value.value === 'http://radarr.local:7878')
  })

  test('rejects a non-http(s) scheme', ({ assert }) => {
    const result = Url.create('ftp://radarr.local')
    assert.isFalse(result.ok)
  })

  test('rejects a malformed URL', ({ assert }) => {
    const result = Url.create('not a url')
    assert.isFalse(result.ok)
  })
})

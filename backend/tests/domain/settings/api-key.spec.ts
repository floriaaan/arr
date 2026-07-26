import { test } from '@japa/runner'
import { ApiKey } from '#domain/settings/api-key.vo'

test.group('ApiKey', () => {
  test('accepts a non-empty key', ({ assert }) => {
    const result = ApiKey.create('abc123')
    assert.isTrue(result.ok)
  })

  test('rejects an empty key', ({ assert }) => {
    const result = ApiKey.create('   ')
    assert.isFalse(result.ok)
  })

  test('never exposes the raw value through toString/toJSON', ({ assert }) => {
    const result = ApiKey.create('super-secret')
    if (!result.ok) throw new Error('unreachable')

    assert.notInclude(result.value.toString(), 'super-secret')
    assert.notInclude(JSON.stringify({ key: result.value }), 'super-secret')
  })

  test('reveal() returns the raw value', ({ assert }) => {
    const result = ApiKey.create('super-secret')
    if (!result.ok) throw new Error('unreachable')

    assert.equal(result.value.reveal(), 'super-secret')
  })
})

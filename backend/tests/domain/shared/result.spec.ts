import { test } from '@japa/runner'
import { Result } from '#domain/shared/result'

test.group('Result', () => {
  test('ok() produces a successful result carrying its value', ({ assert }) => {
    const result = Result.ok(42)
    assert.isTrue(result.ok)
    assert.equal(result.value, 42)
  })

  test('err() produces a failed result carrying its error', ({ assert }) => {
    const result = Result.err('boom')
    assert.isFalse(result.ok)
    assert.equal(result.error, 'boom')
  })
})

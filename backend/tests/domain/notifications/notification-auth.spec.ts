import { test } from '@japa/runner'
import { NotificationAuth } from '#domain/notifications/notification-auth.vo'

test.group('NotificationAuth', () => {
  test('none() carries no Authorization header', ({ assert }) => {
    const auth = NotificationAuth.none()
    assert.equal(auth.mode, 'none')
    assert.isNull(auth.authorizationHeader())
  })

  test('token() builds a Bearer header', ({ assert }) => {
    const result = NotificationAuth.token('tk_abc123')
    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.mode, 'token')
    assert.equal(result.value.authorizationHeader(), 'Bearer tk_abc123')
  })

  test('rejects an empty token', ({ assert }) => {
    const result = NotificationAuth.token('')
    assert.isFalse(result.ok)
  })

  test('basic() builds a base64-encoded Basic header', ({ assert }) => {
    const result = NotificationAuth.basic('alice', 'hunter2')
    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.mode, 'basic')
    assert.equal(result.value.username, 'alice')
    assert.equal(
      result.value.authorizationHeader(),
      `Basic ${Buffer.from('alice:hunter2').toString('base64')}`,
    )
  })

  test('rejects an empty username', ({ assert }) => {
    const result = NotificationAuth.basic('  ', 'hunter2')
    assert.isFalse(result.ok)
  })

  test('rejects an empty password', ({ assert }) => {
    const result = NotificationAuth.basic('alice', '')
    assert.isFalse(result.ok)
  })
})

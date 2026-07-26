import { test } from '@japa/runner'
import { Email } from '#domain/identity/email.vo'
import { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'

function anEmail() {
  const result = Email.create('user@example.com')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('AuthenticatedUser', () => {
  test('isAdmin() reflects the role', ({ assert }) => {
    const admin = AuthenticatedUser.create({ id: '1', email: anEmail(), role: 'admin' })
    const user = AuthenticatedUser.create({ id: '2', email: anEmail(), role: 'user' })

    assert.isTrue(admin.isAdmin())
    assert.isFalse(user.isAdmin())
  })
})

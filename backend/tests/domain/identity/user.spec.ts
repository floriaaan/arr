import { test } from '@japa/runner'
import { Email } from '#domain/identity/email.vo'
import { User } from '#domain/identity/user.entity'

test.group('User', () => {
  test('toAuthenticatedUser() carries over id, email and role', ({ assert }) => {
    const emailResult = Email.create('user@example.com')
    if (!emailResult.ok) throw new Error('unreachable')

    const user = User.create('1', {
      email: emailResult.value,
      role: 'admin',
      createdAt: new Date(),
    })
    const authenticated = user.toAuthenticatedUser()

    assert.equal(authenticated.id, '1')
    assert.equal(authenticated.email.value, 'user@example.com')
    assert.isTrue(authenticated.isAdmin())
  })
})

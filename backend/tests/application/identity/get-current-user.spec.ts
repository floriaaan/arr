import { test } from '@japa/runner'
import { GetCurrentUser } from '#application/identity/get-current-user.use-case'
import type { Session } from '#domain/identity/interfaces/session.interface'
import type { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'
import { AuthenticatedUser as AuthenticatedUserVO } from '#domain/identity/authenticated-user.vo'
import { Email } from '#domain/identity/email.vo'

class FakeSession implements Session {
  constructor(private readonly usersByToken: Map<string, AuthenticatedUser>) {}

  async resolve(sessionToken: string): Promise<AuthenticatedUser | null> {
    return this.usersByToken.get(sessionToken) ?? null
  }
}

test.group('GetCurrentUser', () => {
  test('returns the resolved user for a valid session token', async ({ assert }) => {
    const emailResult = Email.create('user@example.com')
    if (!emailResult.ok) throw new Error('unreachable')

    const user = AuthenticatedUserVO.create({ id: '1', email: emailResult.value, role: 'user' })
    const useCase = new GetCurrentUser(new FakeSession(new Map([['valid-token', user]])))

    const result = await useCase.execute({ sessionToken: 'valid-token' })

    assert.isNotNull(result)
    assert.equal(result?.id, '1')
  })

  test('returns null for an unknown session token', async ({ assert }) => {
    const useCase = new GetCurrentUser(new FakeSession(new Map()))

    const result = await useCase.execute({ sessionToken: 'unknown-token' })

    assert.isNull(result)
  })
})

import { test } from '@japa/runner'
import { SignOut } from '#application/identity/sign-out.use-case'
import type { Authentication } from '#domain/identity/interfaces/authentication.interface'

class FakeAuthentication implements Authentication {
  signedOutTokens: string[] = []

  async signInWithPassword(): Promise<never> {
    throw new Error('not used in this test')
  }

  async signOut(sessionToken: string): Promise<void> {
    this.signedOutTokens.push(sessionToken)
  }
}

test.group('SignOut', () => {
  test('delegates the session token to Authentication', async ({ assert }) => {
    const authentication = new FakeAuthentication()
    const useCase = new SignOut(authentication)

    await useCase.execute({ sessionToken: 'a-token' })

    assert.deepEqual(authentication.signedOutTokens, ['a-token'])
  })
})

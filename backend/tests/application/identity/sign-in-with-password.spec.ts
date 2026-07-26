import { test } from '@japa/runner'
import { SignInWithPassword } from '#application/identity/sign-in-with-password.use-case'
import type {
  Authentication,
  AuthenticationError,
  PasswordCredentials,
} from '#domain/identity/interfaces/authentication.interface'
import type { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'
import { AuthenticatedUser as AuthenticatedUserVO } from '#domain/identity/authenticated-user.vo'
import { Email } from '#domain/identity/email.vo'
import { Result } from '#domain/shared/result'

class FakeAuthentication implements Authentication {
  constructor(private readonly credentials: PasswordCredentials) {}

  async signInWithPassword(
    input: PasswordCredentials,
  ): Promise<Result<AuthenticatedUser, AuthenticationError>> {
    if (
      input.email.equals(this.credentials.email) &&
      input.password === this.credentials.password
    ) {
      return Result.ok(AuthenticatedUserVO.create({ id: '1', email: input.email, role: 'user' }))
    }
    return Result.err('invalid_credentials')
  }

  async signOut(): Promise<void> {}
}

function anEmail() {
  const result = Email.create('user@example.com')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('SignInWithPassword', () => {
  test('delegates to Authentication and returns its result on success', async ({ assert }) => {
    const useCase = new SignInWithPassword(
      new FakeAuthentication({ email: anEmail(), password: 'secret' }),
    )

    const result = await useCase.execute({ email: 'user@example.com', password: 'secret' })

    assert.isTrue(result.ok)
  })

  test('propagates the invalid_credentials error from Authentication', async ({ assert }) => {
    const useCase = new SignInWithPassword(
      new FakeAuthentication({ email: anEmail(), password: 'secret' }),
    )

    const result = await useCase.execute({ email: 'user@example.com', password: 'wrong' })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'invalid_credentials')
  })

  test('rejects a malformed email before calling Authentication', async ({ assert }) => {
    const useCase = new SignInWithPassword(
      new FakeAuthentication({ email: anEmail(), password: 'secret' }),
    )

    const result = await useCase.execute({ email: 'not-an-email', password: 'secret' })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'invalid_email')
  })
})

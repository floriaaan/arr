import type { UseCase } from '#application/shared/use-case'
import type {
  Authentication,
  AuthenticationError,
} from '#domain/identity/interfaces/authentication.interface'
import type { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'
import { Result } from '#domain/shared/result'
import { Email } from '#domain/identity/email.vo'

export interface SignInWithPasswordInput {
  email: string
  password: string
}

export type SignInWithPasswordError = AuthenticationError | 'invalid_email'

export class SignInWithPassword implements UseCase<
  SignInWithPasswordInput,
  Result<AuthenticatedUser, SignInWithPasswordError>
> {
  constructor(private readonly authentication: Authentication) {}

  async execute(
    input: SignInWithPasswordInput,
  ): Promise<Result<AuthenticatedUser, SignInWithPasswordError>> {
    const email = Email.create(input.email)
    if (!email.ok) {
      return Result.err('invalid_email')
    }

    return this.authentication.signInWithPassword({ email: email.value, password: input.password })
  }
}

import { getAuthInstance } from './instance.js'
import type {
  AccountRegistrar,
  RegistrationError,
} from '#domain/identity/interfaces/account-registrar.interface'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { Email } from '#domain/identity/email.vo'
import type { UserRole } from '#domain/identity/user-role.vo'
import { User } from '#domain/identity/user.entity'
import type { User as UserType } from '#domain/identity/user.entity'
import type { Result } from '#domain/shared/result'
import { Result as ResultNS } from '#domain/shared/result'
import { APIError } from 'better-auth'

/**
 * `role` is a declared expectation, not written here: better-auth assigns
 * the actual role via the `databaseHooks.user.create.before` hook in
 * `instance.ts` (first-ever account becomes admin, everyone else defaults
 * to 'user' — no raw SQL write to better-auth's `user` table, per ADR-0005).
 * The only caller, `CreateAdminAccount`, already guards on
 * `UserDirectory.existsAny()` being false before calling this with 'admin',
 * so the two decisions stay in sync without duplicating that check here.
 */
export class BetterAuthAccountRegistrar implements AccountRegistrar {
  constructor(private readonly authSettingsProvider: AuthSettingsProvider) {}

  async register(
    email: Email,
    password: string,
    role: UserRole,
  ): Promise<Result<UserType, RegistrationError>> {
    const auth = await getAuthInstance(this.authSettingsProvider)

    try {
      const signedUp = await auth.api.signUpEmail({
        body: { name: email.value.split('@')[0] ?? email.value, email: email.value, password },
      })

      const grantedRole: UserRole =
        'role' in signedUp.user && signedUp.user.role === 'admin' ? 'admin' : 'user'

      return ResultNS.ok(
        User.create(signedUp.user.id, {
          email,
          role: role === 'admin' ? grantedRole : role,
          createdAt: new Date(signedUp.user.createdAt),
        }),
      )
    } catch (error) {
      if (
        error instanceof APIError &&
        error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
      ) {
        return ResultNS.err('email_already_used')
      }
      if (
        error instanceof APIError &&
        (error.body?.code === 'PASSWORD_TOO_SHORT' || error.body?.code === 'PASSWORD_TOO_LONG')
      ) {
        return ResultNS.err('weak_password')
      }
      throw error
    }
  }
}

import { getAuthInstance } from './instance.js'
import type {
  Authentication,
  AuthenticationError,
  PasswordCredentials,
} from '#domain/identity/interfaces/authentication.interface'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { AuthenticatedUser as AuthenticatedUserType } from '#domain/identity/authenticated-user.vo'
import { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'
import type { Result } from '#domain/shared/result'
import { Result as ResultNS } from '#domain/shared/result'
import { APIError } from 'better-auth'

/**
 * The real browser login flow goes through better-auth's own mounted
 * handler at /api/auth/sign-in/email (it sets the response cookie itself —
 * this port's return type has no room for that). This adapter exists for
 * architectural symmetry and any future non-browser caller; it authenticates
 * against better-auth but does not itself produce a settable cookie.
 */
export class BetterAuthAuthentication implements Authentication {
  constructor(private readonly authSettingsProvider: AuthSettingsProvider) {}

  async signInWithPassword(
    credentials: PasswordCredentials,
  ): Promise<Result<AuthenticatedUserType, AuthenticationError>> {
    const auth = await getAuthInstance(this.authSettingsProvider)

    try {
      const result = await auth.api.signInEmail({
        body: { email: credentials.email.value, password: credentials.password },
      })

      return ResultNS.ok(
        AuthenticatedUser.create({
          id: result.user.id,
          email: credentials.email,
          role: 'role' in result.user && result.user.role === 'admin' ? 'admin' : 'user',
        }),
      )
    } catch (error) {
      const isBannedError =
        error instanceof APIError &&
        error.status === 'FORBIDDEN' &&
        error.body?.code === 'BANNED_USER'

      if (isBannedError) {
        return ResultNS.err('account_disabled')
      }
      return ResultNS.err('invalid_credentials')
    }
  }

  async signOut(sessionToken: string): Promise<void> {
    const auth = await getAuthInstance(this.authSettingsProvider)
    await auth.api.signOut({ headers: new Headers({ cookie: sessionToken }) })
  }
}

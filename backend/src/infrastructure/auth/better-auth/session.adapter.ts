import { getAuthInstance } from './instance.js'
import type { Session } from '#domain/identity/interfaces/session.interface'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { AuthenticatedUser as AuthenticatedUserType } from '#domain/identity/authenticated-user.vo'
import { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'
import { Email } from '#domain/identity/email.vo'

/**
 * `sessionToken` here is the raw `Cookie` request header, not a bare token —
 * better-auth resolves sessions from its own (possibly chunked) cookie jar,
 * so re-deriving its cookie name/format in this adapter would be fragile.
 * The auth middleware (Phase 4) passes `ctx.request.header('cookie')` as-is.
 */
export class BetterAuthSession implements Session {
  constructor(private readonly authSettingsProvider: AuthSettingsProvider) {}

  async resolve(sessionToken: string): Promise<AuthenticatedUserType | null> {
    const auth = await getAuthInstance(this.authSettingsProvider)
    const result = await auth.api.getSession({ headers: new Headers({ cookie: sessionToken }) })
    if (!result) return null

    const email = Email.create(result.user.email)
    if (!email.ok) return null

    const role =
      'role' in result.user && typeof result.user.role === 'string' ? result.user.role : 'user'

    return AuthenticatedUser.create({
      id: result.user.id,
      email: email.value,
      role: role === 'admin' ? 'admin' : 'user',
    })
  }
}

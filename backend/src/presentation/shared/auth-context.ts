import type { HttpContext } from '@adonisjs/core/http'
import type { AuthenticatedUser } from '#domain/identity/authenticated-user.vo'

/**
 * `authenticatedUser` is set on every request by `auth_middleware` (global,
 * cf. #37) — to the resolved user, or `null` when there's no valid session.
 * Declared here rather than `null`-checked ad hoc in every controller.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    authenticatedUser: AuthenticatedUser | null
  }
}

export function getAuthenticatedUser(ctx: HttpContext): AuthenticatedUser | null {
  return ctx.authenticatedUser
}

export function requireAuthenticatedUser(ctx: HttpContext): AuthenticatedUser {
  const user = getAuthenticatedUser(ctx)
  if (!user) {
    throw Object.assign(new Error('Authentication required.'), {
      status: 401,
      code: 'unauthenticated',
    })
  }
  return user
}

export function requireAdmin(ctx: HttpContext): AuthenticatedUser {
  const user = requireAuthenticatedUser(ctx)
  if (!user.isAdmin()) {
    throw Object.assign(new Error('Admin privileges required.'), {
      status: 403,
      code: 'forbidden',
    })
  }
  return user
}

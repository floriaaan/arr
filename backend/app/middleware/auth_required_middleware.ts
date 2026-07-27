import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { requireAuthenticatedUser } from '#presentation/shared/auth-context'

export default class AuthRequiredMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    requireAuthenticatedUser(ctx)
    return next()
  }
}

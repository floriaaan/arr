import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { requireAdmin } from '#presentation/shared/auth-context'

export default class AdminOnlyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    requireAdmin(ctx)
    return next()
  }
}

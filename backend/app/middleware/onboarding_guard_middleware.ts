import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * `/api/onboarding/*` is only reachable while onboarding isn't done yet
 * (cf. docs/phase-0/04-endpoints-http.md) — once `OnboardingState` reaches
 * 'completed', the whole route group disappears rather than exposing an
 * admin-only rerun path.
 */
export default class OnboardingGuardMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const repository = await app.container.make('settings.onboardingStateRepository')
    const state = await repository.get()

    if (state.status === 'completed') {
      ctx.response.status(404).send({
        error: { type: 'not_found', message: 'Onboarding has already been completed.' },
      })
      return
    }

    return next()
  }
}

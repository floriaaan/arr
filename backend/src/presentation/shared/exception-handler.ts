import app from '@adonisjs/core/services/app'
import { ExceptionHandler as BaseExceptionHandler } from '@adonisjs/core/http'

type RenderErrorAsJSON = BaseExceptionHandler['renderErrorAsJSON']

/**
 * Only reached for exceptions that escape a controller uncaught. Expected
 * domain/application errors never get here — controllers convert
 * `Result.err(...)` via `error-serializer.ts` and send a normal response
 * before throwing anything. VineJS validation errors and AdonisJS's own
 * self-handling exceptions (route-not-found, etc.) are also handled by the
 * base class before this method runs.
 */
export class HttpExceptionHandler extends BaseExceptionHandler {
  protected debug = !app.inProduction

  async renderErrorAsJSON(...args: Parameters<RenderErrorAsJSON>): ReturnType<RenderErrorAsJSON> {
    const [error, ctx] = args
    if (this.isDebuggingEnabled(ctx)) return super.renderErrorAsJSON(error, ctx)

    ctx.response.status(error.status).send({
      code: error.code ?? 'internal_error',
      message: error.message,
    })
  }
}

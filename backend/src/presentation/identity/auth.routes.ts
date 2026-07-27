import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

const SessionController = () => import('./session.controller.js')

async function toFetchRequest(ctx: HttpContext): Promise<Request> {
  const headers = new Headers()
  for (const [key, value] of Object.entries(ctx.request.headers())) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const method = ctx.request.method()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  return new Request(ctx.request.completeUrl(true), {
    method,
    headers,
    body: hasBody ? (ctx.request.raw() ?? undefined) : undefined,
  })
}

async function sendFetchResponse(response: Response, ctx: HttpContext): Promise<void> {
  ctx.response.status(response.status)
  response.headers.forEach((value, key) => ctx.response.header(key, value))
  ctx.response.send(Buffer.from(await response.arrayBuffer()))
}

/**
 * better-auth owns everything under `/api/auth/*` (email/password sign-up &
 * sign-in, OIDC callback, sign-out) via its own Fetch-API handler — this
 * only bridges Adonis's Node request/response into a `Request`/`Response`
 * pair. Uses `ctx.request.raw()` rather than the live Node stream, since
 * `bodyparser_middleware` (global, cf. start/kernel.ts) already consumed
 * the original `IncomingMessage` by the time this route runs.
 */
router.any('/api/auth/*', async (ctx: HttpContext) => {
  const authHandler = await app.container.make('identity.authHandler')
  const response = await authHandler(await toFetchRequest(ctx))
  await sendFetchResponse(response, ctx)
})

router.get('/api/session', [SessionController, 'show'])

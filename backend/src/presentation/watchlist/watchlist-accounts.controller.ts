import app from '@adonisjs/core/services/app'
import { StartPlexLink } from '#application/watchlist/start-plex-link.use-case'
import { CompletePlexLink } from '#application/watchlist/complete-plex-link.use-case'
import { LinkMediaServerAccount } from '#application/watchlist/link-media-server-account.use-case'
import { ListUserMediaAccounts } from '#application/watchlist/list-user-media-accounts.use-case'
import { UnlinkMediaAccount } from '#application/watchlist/unlink-media-account.use-case'
import { SetWatchlistEnabled } from '#application/watchlist/set-watchlist-enabled.use-case'
import { requireAuthenticatedUser } from '#presentation/shared/auth-context'
import { serializeError } from '#presentation/shared/error-serializer'
import { toUserMediaAccountDto } from './user-media-account.dto.js'
import { linkMediaServerAccountValidator } from './link-media-server-account.validator.js'
import { completePlexLinkValidator } from './complete-plex-link.validator.js'
import type { HttpContext } from '@adonisjs/core/http'

export default class WatchlistAccountsController {
  async index(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const repository = await app.container.make('watchlist.accountRepository')

    const accounts = await new ListUserMediaAccounts(repository).execute(user.id)
    return ctx.response.json({ accounts: accounts.map(toUserMediaAccountDto) })
  }

  async startPlexLink(ctx: HttpContext) {
    requireAuthenticatedUser(ctx)
    const registry = await app.container.make('watchlist.providerRegistry')

    const result = await new StartPlexLink(registry.resolvePlexLink()).execute()
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.json(result.value)
  }

  async completePlexLink(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const registry = await app.container.make('watchlist.providerRegistry')
    const repository = await app.container.make('watchlist.accountRepository')
    const idGenerator = await app.container.make('shared.idGenerator')
    const clock = await app.container.make('shared.clock')

    const payload = await ctx.request.validateUsing(completePlexLinkValidator)
    const result = await new CompletePlexLink(
      registry.resolvePlexLink(),
      repository,
      idGenerator,
      clock,
    ).execute({ userId: user.id, pin: payload.pin })

    if (!result.ok) {
      if (result.error === 'pending') {
        return ctx.response.json({ status: 'pending' })
      }
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.json({ status: 'linked', account: toUserMediaAccountDto(result.value) })
  }

  async linkMediaServer(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const kind = ctx.params.kind
    if (kind !== 'jellyfin' && kind !== 'emby') {
      return ctx.response
        .status(400)
        .send({ error: { type: 'validation_failed', message: 'Unknown media server kind.' } })
    }
    const payload = await ctx.request.validateUsing(linkMediaServerAccountValidator)

    const registry = await app.container.make('watchlist.providerRegistry')
    const repository = await app.container.make('watchlist.accountRepository')
    const idGenerator = await app.container.make('shared.idGenerator')
    const clock = await app.container.make('shared.clock')

    const result = await new LinkMediaServerAccount(
      registry.resolveAuthProvider(kind),
      repository,
      idGenerator,
      clock,
    ).execute({ userId: user.id, kind, ...payload })

    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.json({ account: toUserMediaAccountDto(result.value) })
  }

  async setEnabled(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const repository = await app.container.make('watchlist.accountRepository')
    const clock = await app.container.make('shared.clock')

    const result = await new SetWatchlistEnabled(repository, clock).execute({
      id: ctx.params.id,
      userId: user.id,
      enabled: Boolean(ctx.request.input('enabled')),
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.json({ account: toUserMediaAccountDto(result.value) })
  }

  async destroy(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const repository = await app.container.make('watchlist.accountRepository')

    const result = await new UnlinkMediaAccount(repository).execute({
      id: ctx.params.id,
      userId: user.id,
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.status(204).send('')
  }
}

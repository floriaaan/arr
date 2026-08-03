import app from '@adonisjs/core/services/app'
import { GetWatchlistSettings } from '#application/watchlist/get-watchlist-settings.use-case'
import { SaveWatchlistSettings } from '#application/watchlist/save-watchlist-settings.use-case'
import { ListAllMediaAccounts } from '#application/watchlist/list-all-media-accounts.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toWatchlistSettingsDto } from './watchlist-settings.dto.js'
import { saveWatchlistSettingsValidator } from './watchlist-settings.validator.js'
import { toUserMediaAccountAdminDto } from '#presentation/watchlist/user-media-account.dto'
import type { HttpContext } from '@adonisjs/core/http'

export default class WatchlistSettingsController {
  async show(ctx: HttpContext) {
    const repository = await app.container.make('watchlist.settingsRepository')
    const settings = await new GetWatchlistSettings(repository).execute()
    return ctx.response.json({ watchlist: toWatchlistSettingsDto(settings) })
  }

  async update(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(saveWatchlistSettingsValidator)
    const repository = await app.container.make('watchlist.settingsRepository')

    const result = await new SaveWatchlistSettings(repository).execute(payload)
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }
    return ctx.response.json({ watchlist: toWatchlistSettingsDto(result.value) })
  }

  async listAccounts(ctx: HttpContext) {
    const repository = await app.container.make('watchlist.accountRepository')
    const userDirectory = await app.container.make('identity.userDirectory')

    const accounts = await new ListAllMediaAccounts(repository).execute()
    return ctx.response.json({
      accounts: await Promise.all(
        accounts.map((account) => toUserMediaAccountAdminDto(account, userDirectory)),
      ),
    })
  }
}

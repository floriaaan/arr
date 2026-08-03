import app from '@adonisjs/core/services/app'
import { ListUserRequestPreferences } from '#application/requests/list-user-request-preferences.use-case'
import { SetUserAutoApprove } from '#application/requests/set-user-auto-approve.use-case'
import { setUserAutoApproveValidator } from './user-request-preferences.validator.js'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserRequestPreferencesController {
  async index(ctx: HttpContext) {
    const repository = await app.container.make('requests.userPreferencesRepository')
    const preferences = await new ListUserRequestPreferences(repository).execute()
    return ctx.response.json({ preferences })
  }

  async update(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(setUserAutoApproveValidator)
    const repository = await app.container.make('requests.userPreferencesRepository')

    await new SetUserAutoApprove(repository).execute({
      userId: ctx.params.userId,
      autoApprove: payload.autoApprove,
    })
    return ctx.response.json({ ok: true })
  }
}

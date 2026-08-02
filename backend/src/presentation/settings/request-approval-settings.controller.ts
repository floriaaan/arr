import app from '@adonisjs/core/services/app'
import { GetRequestApprovalSettings } from '#application/requests/get-request-approval-settings.use-case'
import { SaveRequestApprovalSettings } from '#application/requests/save-request-approval-settings.use-case'
import { toRequestApprovalSettingsDto } from './request-approval-settings.dto.js'
import { saveRequestApprovalSettingsValidator } from './request-approval-settings.validator.js'
import type { HttpContext } from '@adonisjs/core/http'

export default class RequestApprovalSettingsController {
  async show(ctx: HttpContext) {
    const repository = await app.container.make('requests.approvalSettingsRepository')
    const settings = await new GetRequestApprovalSettings(repository).execute()
    return ctx.response.json({ requestApproval: toRequestApprovalSettingsDto(settings) })
  }

  async update(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(saveRequestApprovalSettingsValidator)
    const repository = await app.container.make('requests.approvalSettingsRepository')

    const settings = await new SaveRequestApprovalSettings(repository).execute(payload)
    return ctx.response.json({ requestApproval: toRequestApprovalSettingsDto(settings) })
  }
}

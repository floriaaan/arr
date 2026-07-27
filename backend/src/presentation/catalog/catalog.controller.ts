import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { SearchMedia } from '#application/catalog/search-media.use-case'
import { GetMediaDetail } from '#application/catalog/get-media-detail.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toMediaItemDto, toMediaDetailDto } from './media.dto.js'
import { searchMediaValidator, mediaDetailValidator } from './search.validator.js'

export default class CatalogController {
  async search(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(searchMediaValidator)
    const lookup = await app.container.make('catalog.mediaLookup')
    const signer = await app.container.make('images.refSigner')

    const results = await new SearchMedia(lookup).execute(payload)
    return ctx.response.json({ results: results.map((item) => toMediaItemDto(item, signer)) })
  }

  async detail(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(mediaDetailValidator)
    const lookup = await app.container.make('catalog.mediaLookup')
    const signer = await app.container.make('images.refSigner')

    const result = await new GetMediaDetail(lookup).execute(payload)
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ detail: toMediaDetailDto(result.value, signer) })
  }
}

import { createHash } from 'node:crypto'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { serializeError } from '#presentation/shared/error-serializer'

const imageRefValidator = vine.compile(vine.object({ ref: vine.string() }))

export default class ImageProxyController {
  async show(ctx: HttpContext) {
    const { ref } = await ctx.request.validateUsing(imageRefValidator)

    const proxyService = await app.container.make('images.proxyService')
    const result = await proxyService.serve(ref)

    if (!result.ok) {
      if (result.reason === 'fetch_failed') {
        const { status, body } = serializeError('not_found')
        return ctx.response.status(status).send(body)
      }
      return ctx.response.status(403).send({
        error: {
          type: 'forbidden',
          message: 'Image reference is invalid, expired, or not allowed.',
        },
      })
    }

    const etag = createHash('sha1').update(result.buffer).digest('hex')
    ctx.response.header('Content-Type', result.contentType)
    ctx.response.header('Cache-Control', 'public, max-age=604800')
    ctx.response.header('ETag', etag)
    return ctx.response.send(result.buffer)
  }
}

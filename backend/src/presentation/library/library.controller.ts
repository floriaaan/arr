import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { ListLibrary } from '#application/library/list-library.use-case'
import { RemoveLibraryItem } from '#application/library/remove-library-item.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toLibraryItemDto } from './library.dto.js'
import { removeLibraryItemValidator } from './library.validator.js'
import type { MediaKind } from '#domain/catalog/media-kind.vo'

const MEDIA_KINDS: readonly MediaKind[] = ['movie', 'series', 'album']

export default class LibraryController {
  async index(ctx: HttpContext) {
    const qs = ctx.request.qs()
    const kind =
      typeof qs.kind === 'string' && MEDIA_KINDS.includes(qs.kind as MediaKind)
        ? (qs.kind as MediaKind)
        : undefined

    const library = await app.container.make('catalog.mediaLibrary')
    const signer = await app.container.make('images.refSigner')

    const items = await new ListLibrary(library).execute({ kind })
    return ctx.response.json({ items: items.map((item) => toLibraryItemDto(item, signer)) })
  }

  async remove(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(removeLibraryItemValidator)
    const library = await app.container.make('catalog.mediaLibrary')

    const result = await new RemoveLibraryItem(library).execute({
      scheme: payload.scheme,
      value: payload.value,
      deleteFiles: payload.deleteFiles === 'true',
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    ctx.response.status(204)
    return ctx.response.send('')
  }
}

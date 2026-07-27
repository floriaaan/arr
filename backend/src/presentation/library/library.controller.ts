import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { ListLibrary } from '#application/library/list-library.use-case'
import { toLibraryItemDto } from './library.dto.js'
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
}

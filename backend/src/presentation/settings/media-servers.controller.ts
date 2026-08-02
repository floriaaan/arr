import app from '@adonisjs/core/services/app'
import { ListMediaServers } from '#application/settings/list-media-servers.use-case'
import { SaveMediaServer } from '#application/settings/save-media-server.use-case'
import { DeleteMediaServer } from '#application/settings/delete-media-server.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toMediaServerDto } from './media-server.dto.js'
import { saveMediaServerValidator } from './media-server.validator.js'
import type { HttpContext } from '@adonisjs/core/http'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

/**
 * `index` is mounted under `authRequired` while the writes sit under
 * `adminOnly` (plus one onboarding-guarded write): every signed-in user
 * needs the list to render the "open in Plex/Jellyfin/Emby" links in the
 * media detail drawer, and there is no secret on the DTO to protect
 * (cf. docs/phase-5-quality-of-life, chantier 2 décisions 5 et 6).
 */
export default class MediaServersController {
  async index(ctx: HttpContext) {
    const repository = await app.container.make('settings.mediaServerRepository')
    const servers = await new ListMediaServers(repository).execute()
    return ctx.response.json({ mediaServers: servers.map(toMediaServerDto) })
  }

  async save(ctx: HttpContext) {
    const kind = ctx.params.kind as MediaServerKind
    const payload = await ctx.request.validateUsing(saveMediaServerValidator)

    const repository = await app.container.make('settings.mediaServerRepository')
    const idGenerator = await app.container.make('shared.idGenerator')

    const result = await new SaveMediaServer(repository, idGenerator).execute({ kind, ...payload })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ mediaServer: toMediaServerDto(result.value) })
  }

  async destroy(ctx: HttpContext) {
    const kind = ctx.params.kind as MediaServerKind
    const repository = await app.container.make('settings.mediaServerRepository')

    await new DeleteMediaServer(repository).execute({ kind })
    ctx.response.status(204)
    return ctx.response.send('')
  }
}

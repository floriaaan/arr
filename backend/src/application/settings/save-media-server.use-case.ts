import { Result } from '#domain/shared/result'
import { Url } from '#domain/settings/url.vo'
import { MediaServer } from '#domain/settings/media-server.aggregate'
import type { UseCase } from '#application/shared/use-case'
import type { MediaServerRepository } from '#domain/settings/interfaces/media-server-repository.interface'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { ValidationError } from '#domain/shared/validation-error'

export interface SaveMediaServerInput {
  kind: MediaServerKind
  baseUrl: string
  enabled: boolean
}

/**
 * Upsert by kind (`unique(kind)`, cf. ADR-0006 applied to media servers).
 * No connection test on the way in: this app never calls the media server's
 * API, it only builds links to it (cf. docs/phase-5-quality-of-life).
 */
export class SaveMediaServer implements UseCase<
  SaveMediaServerInput,
  Result<MediaServer, ValidationError>
> {
  constructor(
    private readonly repository: MediaServerRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: SaveMediaServerInput): Promise<Result<MediaServer, ValidationError>> {
    const baseUrl = Url.create(input.baseUrl)
    if (!baseUrl.ok) return baseUrl

    const existing = await this.repository.findByKind(input.kind)
    const server =
      existing ?? MediaServer.create(this.idGenerator.next(), input.kind, baseUrl.value)

    if (existing) server.updateBaseUrl(baseUrl.value)
    if (input.enabled) server.enable()
    else server.disable()

    await this.repository.save(server)
    return Result.ok(server)
  }
}

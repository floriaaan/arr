import { AggregateRoot } from '#domain/shared/aggregate-root'
import type { MediaServerKind } from './media-server-kind.vo.js'
import type { Url } from './url.vo.js'

export interface MediaServerProps {
  kind: MediaServerKind
  baseUrl: Url
  enabled: boolean
}

/**
 * A Plex/Jellyfin/Emby instance, declared for the sole purpose of linking
 * to it from an item's detail (cf. docs/phase-5-quality-of-life decision 1):
 * no API key, no health check, no `Result` on the state transitions —
 * there is nothing to authenticate against and nothing to validate beyond
 * the URL itself, which `Url.create` already covers. This is deliberately
 * much thinner than `ServarrInstance`.
 */
export class MediaServer extends AggregateRoot<string> {
  private props: MediaServerProps

  private constructor(id: string, props: MediaServerProps) {
    super(id)
    this.props = props
  }

  static create(id: string, kind: MediaServerKind, baseUrl: Url): MediaServer {
    return new MediaServer(id, { kind, baseUrl, enabled: true })
  }

  /** Used by the persistence mapper to rehydrate an already-valid aggregate. */
  static reconstruct(id: string, props: MediaServerProps): MediaServer {
    return new MediaServer(id, props)
  }

  get kind(): MediaServerKind {
    return this.props.kind
  }

  get baseUrl(): Url {
    return this.props.baseUrl
  }

  get enabled(): boolean {
    return this.props.enabled
  }

  updateBaseUrl(baseUrl: Url): void {
    this.props.baseUrl = baseUrl
  }

  enable(): void {
    this.props.enabled = true
  }

  disable(): void {
    this.props.enabled = false
  }
}

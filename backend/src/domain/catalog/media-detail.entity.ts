import { Entity } from '#domain/shared/entity'
import type { MediaKind } from './media-kind.vo.js'
import type { ExternalId } from './external-id.vo.js'
import type { PosterRef } from './poster-ref.vo.js'

export interface ManagedByInfo {
  instanceId: string
  rootFolderPath: string
  qualityProfileId: number
}

export interface MediaDetailProps {
  kind: MediaKind
  title: string
  year: number | null
  overview: string
  posterRef: PosterRef | null
  alreadyManaged: boolean
  genres: string[]
  runtimeMinutes?: number
  network?: string
  status?: string
  managedBy?: ManagedByInfo
}

export class MediaDetail extends Entity<ExternalId> {
  private props: MediaDetailProps

  private constructor(id: ExternalId, props: MediaDetailProps) {
    super(id)
    this.props = props
  }

  static create(id: ExternalId, props: MediaDetailProps): MediaDetail {
    return new MediaDetail(id, props)
  }

  get externalId(): ExternalId {
    return this.id
  }

  get kind(): MediaKind {
    return this.props.kind
  }

  get title(): string {
    return this.props.title
  }

  get year(): number | null {
    return this.props.year
  }

  get overview(): string {
    return this.props.overview
  }

  get posterRef(): PosterRef | null {
    return this.props.posterRef
  }

  get alreadyManaged(): boolean {
    return this.props.alreadyManaged
  }

  get genres(): string[] {
    return this.props.genres
  }

  get runtimeMinutes(): number | undefined {
    return this.props.runtimeMinutes
  }

  get network(): string | undefined {
    return this.props.network
  }

  get status(): string | undefined {
    return this.props.status
  }

  get managedBy(): ManagedByInfo | undefined {
    return this.props.managedBy
  }

  equals(other: unknown): boolean {
    if (!(other instanceof MediaDetail)) return false
    return this.id.equals(other.id)
  }
}

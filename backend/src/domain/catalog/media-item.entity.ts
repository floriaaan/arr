import { Entity } from '#domain/shared/entity'
import type { MediaKind } from './media-kind.vo.js'
import type { ExternalId } from './external-id.vo.js'
import type { PosterRef } from './poster-ref.vo.js'

export interface MediaItemProps {
  kind: MediaKind
  title: string
  year: number | null
  overview: string
  posterRef: PosterRef | null
  alreadyManaged: boolean
}

/** A search result — identity is the ExternalId, not a locally-generated id. */
export class MediaItem extends Entity<ExternalId> {
  private props: MediaItemProps

  private constructor(id: ExternalId, props: MediaItemProps) {
    super(id)
    this.props = props
  }

  static create(id: ExternalId, props: MediaItemProps): MediaItem {
    return new MediaItem(id, props)
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

  equals(other: unknown): boolean {
    if (!(other instanceof MediaItem)) return false
    return this.id.equals(other.id)
  }
}

import { Entity } from '#domain/shared/entity'
import type { MediaKind } from './media-kind.vo.js'
import type { ExternalId } from './external-id.vo.js'
import type { PosterRef } from './poster-ref.vo.js'

export interface LibraryItemProps {
  kind: MediaKind
  title: string
  year: number | null
  posterRef: PosterRef | null
  monitored: boolean
  hasFile: boolean
  sizeOnDiskBytes: number
  status: string
  instanceId: string
}

/**
 * What a *arr instance already manages — distinct from `MediaItem`, which is
 * a search result that may or may not exist there yet.
 */
export class LibraryItem extends Entity<ExternalId> {
  private props: LibraryItemProps

  private constructor(id: ExternalId, props: LibraryItemProps) {
    super(id)
    this.props = props
  }

  static create(id: ExternalId, props: LibraryItemProps): LibraryItem {
    return new LibraryItem(id, props)
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

  get posterRef(): PosterRef | null {
    return this.props.posterRef
  }

  get monitored(): boolean {
    return this.props.monitored
  }

  get hasFile(): boolean {
    return this.props.hasFile
  }

  get sizeOnDiskBytes(): number {
    return this.props.sizeOnDiskBytes
  }

  get status(): string {
    return this.props.status
  }

  get instanceId(): string {
    return this.props.instanceId
  }

  equals(other: unknown): boolean {
    if (!(other instanceof LibraryItem)) return false
    return this.id.equals(other.id)
  }
}

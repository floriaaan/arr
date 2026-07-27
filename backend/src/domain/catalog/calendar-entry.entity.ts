import { Entity } from '#domain/shared/entity'
import type { PosterRef } from './poster-ref.vo.js'

export type CalendarEntryKind = 'movie' | 'episode' | 'album'

export interface CalendarEntryProps {
  kind: CalendarEntryKind
  title: string
  subtitle: string | null
  releaseDate: string
  posterRef: PosterRef | null
  monitored: boolean
  hasFile: boolean
  instanceId: string
}

/**
 * One upcoming/past release occurrence — a movie, a single episode, or an
 * album. Identity is a synthetic `<kind>:<instanceId>:<remoteId>` string
 * rather than an `ExternalId`: Sonarr's calendar is per-episode, so the same
 * series (one `ExternalId`) legitimately produces many entries.
 */
export class CalendarEntry extends Entity<string> {
  private props: CalendarEntryProps

  private constructor(id: string, props: CalendarEntryProps) {
    super(id)
    this.props = props
  }

  static create(id: string, props: CalendarEntryProps): CalendarEntry {
    return new CalendarEntry(id, props)
  }

  get entryId(): string {
    return this.id
  }

  get kind(): CalendarEntryKind {
    return this.props.kind
  }

  get title(): string {
    return this.props.title
  }

  get subtitle(): string | null {
    return this.props.subtitle
  }

  get releaseDate(): string {
    return this.props.releaseDate
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

  get instanceId(): string {
    return this.props.instanceId
  }

  equals(other: unknown): boolean {
    if (!(other instanceof CalendarEntry)) return false
    return this.id === other.id
  }
}

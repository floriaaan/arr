import { AggregateRoot } from '#domain/shared/aggregate-root'
import type { MediaKind } from '#domain/catalog/media-kind.vo'

export type ApprovalPolicy = 'auto' | 'manual'

export interface RequestApprovalSettingsProps {
  moviePolicy: ApprovalPolicy
  seriesPolicy: ApprovalPolicy
  albumPolicy: ApprovalPolicy
}

const POLICY_KEY_BY_KIND: Record<MediaKind, keyof RequestApprovalSettingsProps> = {
  movie: 'moviePolicy',
  series: 'seriesPolicy',
  album: 'albumPolicy',
}

/**
 * Single-row settings, same shape as `NotificationSettings`. Governs every
 * `MediaRequest`, manual or watchlist-originated — approval is not scoped to
 * one origin (cf. docs/phase-7-watchlist-sync, chantier 4).
 */
export class RequestApprovalSettings extends AggregateRoot<string> {
  private props: RequestApprovalSettingsProps

  private constructor(id: string, props: RequestApprovalSettingsProps) {
    super(id)
    this.props = props
  }

  /** `auto` on every kind — preserves today's instant-submit behavior until an admin opts a kind into manual review. */
  static create(id: string): RequestApprovalSettings {
    return new RequestApprovalSettings(id, {
      moviePolicy: 'auto',
      seriesPolicy: 'auto',
      albumPolicy: 'auto',
    })
  }

  static reconstruct(id: string, props: RequestApprovalSettingsProps): RequestApprovalSettings {
    return new RequestApprovalSettings(id, props)
  }

  get moviePolicy(): ApprovalPolicy {
    return this.props.moviePolicy
  }

  get seriesPolicy(): ApprovalPolicy {
    return this.props.seriesPolicy
  }

  get albumPolicy(): ApprovalPolicy {
    return this.props.albumPolicy
  }

  policyFor(kind: MediaKind): ApprovalPolicy {
    return this.props[POLICY_KEY_BY_KIND[kind]]
  }

  configure(props: RequestApprovalSettingsProps): void {
    this.props = props
  }
}

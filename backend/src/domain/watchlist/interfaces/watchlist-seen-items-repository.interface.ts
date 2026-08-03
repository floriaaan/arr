import type { ExternalId } from '#domain/catalog/external-id.vo'

/**
 * No aggregate — a permanent dedup record, not a mutable domain object.
 * Once an item is seen for an account it is never proposed again
 * automatically, even rejected or removed-then-re-added (cf.
 * docs/phase-7-watchlist-sync, chantier 6 décision 2).
 */
export interface WatchlistSeenItemsRepository {
  hasSeen(userMediaAccountId: string, externalId: ExternalId): Promise<boolean>
  markSeen(
    userMediaAccountId: string,
    externalId: ExternalId,
    mediaRequestId: string | null,
    now: Date,
  ): Promise<void>
}

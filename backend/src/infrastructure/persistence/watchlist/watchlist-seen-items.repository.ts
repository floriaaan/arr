import { DateTime } from 'luxon'
import WatchlistSeenItemLucidModel from './watchlist_seen_item.lucid.js'
import type { WatchlistSeenItemsRepository } from '#domain/watchlist/interfaces/watchlist-seen-items-repository.interface'
import type { ExternalId } from '#domain/catalog/external-id.vo'

export class LucidWatchlistSeenItemsRepository implements WatchlistSeenItemsRepository {
  async hasSeen(userMediaAccountId: string, externalId: ExternalId): Promise<boolean> {
    const row = await WatchlistSeenItemLucidModel.query()
      .where('userMediaAccountId', userMediaAccountId)
      .where('externalIdScheme', externalId.scheme)
      .where('externalIdValue', externalId.value)
      .first()
    return row !== null
  }

  async markSeen(
    userMediaAccountId: string,
    externalId: ExternalId,
    mediaRequestId: string | null,
    now: Date,
  ): Promise<void> {
    const model = new WatchlistSeenItemLucidModel()
    model.id = crypto.randomUUID()
    model.userMediaAccountId = userMediaAccountId
    model.externalIdScheme = externalId.scheme
    model.externalIdValue = externalId.value
    model.mediaRequestId = mediaRequestId
    model.firstSeenAt = DateTime.fromJSDate(now)
    await model.save()
  }
}

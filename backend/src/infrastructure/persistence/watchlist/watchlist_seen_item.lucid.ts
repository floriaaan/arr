import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class WatchlistSeenItemLucidModel extends BaseModel {
  static table = 'watchlist_seen_items'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userMediaAccountId: string

  @column()
  declare externalIdScheme: string

  @column()
  declare externalIdValue: string

  @column()
  declare mediaRequestId: string | null

  @column.dateTime()
  declare firstSeenAt: DateTime
}

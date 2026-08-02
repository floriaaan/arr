import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UserMediaAccountLucidModel extends BaseModel {
  static table = 'user_media_accounts'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare kind: string

  @column()
  declare externalUserId: string

  @column()
  declare username: string

  @column()
  declare accessTokenEncrypted: string

  @column()
  declare baseUrl: string | null

  @column()
  declare watchlistEnabled: boolean

  @column.dateTime()
  declare lastSyncedAt: DateTime | null

  @column()
  declare lastSyncError: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

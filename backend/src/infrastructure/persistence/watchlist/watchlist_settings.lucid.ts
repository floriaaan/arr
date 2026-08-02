import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class WatchlistSettingsLucidModel extends BaseModel {
  static table = 'watchlist_settings'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare enabled: boolean

  @column()
  declare intervalMinutes: number

  @column()
  declare maxNewRequestsPerRun: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

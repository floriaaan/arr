import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class RequestApprovalSettingsLucidModel extends BaseModel {
  static table = 'request_approval_settings'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare moviePolicy: 'auto' | 'manual'

  @column()
  declare seriesPolicy: 'auto' | 'manual'

  @column()
  declare albumPolicy: 'auto' | 'manual'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

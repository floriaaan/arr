import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class UserRequestPreferencesLucidModel extends BaseModel {
  static table = 'user_request_preferences'

  @column({ isPrimary: true })
  declare userId: string

  @column()
  declare autoApprove: boolean | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

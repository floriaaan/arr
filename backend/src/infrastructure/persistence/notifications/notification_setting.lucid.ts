import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class NotificationSettingLucidModel extends BaseModel {
  static table = 'notification_settings'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare webhookUrlEncrypted: string | null

  @column()
  declare authMode: 'none' | 'token' | 'basic'

  @column()
  declare tokenEncrypted: string | null

  @column()
  declare username: string | null

  @column()
  declare passwordEncrypted: string | null

  @column()
  declare onRequestCreated: boolean

  @column()
  declare onRequestAvailable: boolean

  @column()
  declare onRequestFailed: boolean

  @column()
  declare onInstanceUnreachable: boolean

  @column()
  declare onRequestPendingApproval: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

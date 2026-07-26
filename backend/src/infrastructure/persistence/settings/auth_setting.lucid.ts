import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class AuthSettingLucidModel extends BaseModel {
  static table = 'auth_settings'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare oidcIssuerUrl: string | null

  @column()
  declare oidcClientId: string | null

  @column()
  declare oidcClientSecretEncrypted: string | null

  @column()
  declare oidcClaimsMapping: Record<string, string> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

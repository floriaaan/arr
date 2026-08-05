import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ServarrInstanceLucidModel extends BaseModel {
  static table = 'servarr_instances'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare kind: string

  @column()
  declare baseUrl: string

  @column()
  declare apiKeyEncrypted: string

  @column()
  declare rootFolderPath: string | null

  @column()
  declare qualityProfileId: number | null

  @column()
  declare metadataProfileId: number | null

  @column()
  declare languageProfileId: number | null

  @column()
  declare seriesType: string | null

  @column()
  declare minimumAvailability: string | null

  @column()
  declare enabled: boolean

  @column()
  declare disabledReason: string | null

  @column.dateTime()
  declare lastHealthCheckAt: DateTime | null

  @column()
  declare lastHealthCheckOk: boolean | null

  @column()
  declare lastHealthCheckErrorType: string | null

  @column()
  declare lastHealthCheckErrorMessage: string | null

  @column()
  declare detectedVersion: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

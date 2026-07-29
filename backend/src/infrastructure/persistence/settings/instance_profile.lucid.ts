import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class InstanceProfileLucidModel extends BaseModel {
  static table = 'instance_profiles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare instanceId: string

  @column()
  declare name: string

  @column()
  declare rootFolderPath: string

  @column()
  declare qualityProfileId: number

  @column()
  declare metadataProfileId: number | null

  @column()
  declare languageProfileId: number | null

  @column()
  declare seriesType: string | null

  @column()
  declare minimumAvailability: string | null

  @column()
  declare isDefault: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

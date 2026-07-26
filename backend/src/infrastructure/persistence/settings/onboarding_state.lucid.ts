import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class OnboardingStateLucidModel extends BaseModel {
  static table = 'onboarding_state'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare status: string

  @column.dateTime()
  declare adminCreatedAt: DateTime | null

  @column.dateTime()
  declare servicesConfiguredAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

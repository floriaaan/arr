import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class MediaRequestLucidModel extends BaseModel {
  static table = 'media_requests'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare requestedByUserId: string

  @column()
  declare kind: string

  @column()
  declare externalIdScheme: string

  @column()
  declare externalIdValue: string

  @column()
  declare title: string

  @column()
  declare servarrInstanceId: string

  @column()
  declare externalRefRemoteId: string | null

  @column()
  declare status: string

  @column()
  declare progressPercentage: number | null

  @column()
  declare progressSizeLeftBytes: number | null

  @column.dateTime()
  declare progressEta: DateTime | null

  @column()
  declare progressStepLabel: string | null

  @column()
  declare failureReason: string | null

  @column()
  declare origin: string

  @column()
  declare requiresApproval: boolean

  @column.dateTime()
  declare approvedAt: DateTime | null

  @column()
  declare approvedByUserId: string | null

  @column.dateTime()
  declare rejectedAt: DateTime | null

  @column()
  declare rejectionReason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

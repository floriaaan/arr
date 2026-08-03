import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('origin').notNullable().defaultTo('manual')
      table.boolean('requires_approval').notNullable().defaultTo(false)
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.text('approved_by_user_id').nullable().references('id').inTable('user')
      table.timestamp('rejected_at', { useTz: true }).nullable()
      table.text('rejection_reason').nullable()
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint media_requests_origin_check ` +
        "check (origin in ('manual', 'watchlist'))",
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('origin')
      table.dropColumn('requires_approval')
      table.dropColumn('approved_at')
      table.dropColumn('approved_by_user_id')
      table.dropColumn('rejected_at')
      table.dropColumn('rejection_reason')
    })
  }
}

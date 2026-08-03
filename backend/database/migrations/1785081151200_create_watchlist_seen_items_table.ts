import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'watchlist_seen_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('user_media_account_id')
        .notNullable()
        .references('id')
        .inTable('user_media_accounts')
        .onDelete('CASCADE')
      table.text('external_id_scheme').notNullable()
      table.text('external_id_value').notNullable()
      table.uuid('media_request_id').nullable().references('id').inTable('media_requests')
      table.timestamp('first_seen_at', { useTz: true }).notNullable()

      table.unique(['user_media_account_id', 'external_id_scheme', 'external_id_value'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_media_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('user_id').notNullable().references('id').inTable('user')
      table.text('kind').notNullable()
      table.text('external_user_id').notNullable()
      table.text('username').notNullable()
      table.text('access_token_encrypted').notNullable()
      table.text('base_url').nullable()
      table.boolean('watchlist_enabled').notNullable().defaultTo(true)
      table.timestamp('last_synced_at', { useTz: true }).nullable()
      table.text('last_sync_error').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['user_id', 'kind'])
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint user_media_accounts_kind_check ` +
        "check (kind in ('plex', 'jellyfin', 'emby'))",
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

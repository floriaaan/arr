import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_servers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('kind').notNullable()
      table.text('base_url').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['kind'])
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint media_servers_kind_check check (kind in ('plex', 'jellyfin', 'emby'))`,
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

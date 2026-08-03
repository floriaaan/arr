import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'request_approval_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('movie_policy').notNullable().defaultTo('auto')
      table.text('series_policy').notNullable().defaultTo('auto')
      table.text('album_policy').notNullable().defaultTo('auto')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint request_approval_settings_movie_policy_check ` +
        "check (movie_policy in ('auto', 'manual'))",
    )
    this.schema.raw(
      `alter table ${this.tableName} add constraint request_approval_settings_series_policy_check ` +
        "check (series_policy in ('auto', 'manual'))",
    )
    this.schema.raw(
      `alter table ${this.tableName} add constraint request_approval_settings_album_policy_check ` +
        "check (album_policy in ('auto', 'manual'))",
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('requested_by_user_id').notNullable().references('id').inTable('user')
      table.text('kind').notNullable()
      table.text('external_id_scheme').notNullable()
      table.text('external_id_value').notNullable()
      table.text('title').notNullable()
      table.uuid('servarr_instance_id').notNullable().references('id').inTable('servarr_instances')
      table.text('external_ref_remote_id').nullable()
      table.text('status').notNullable().defaultTo('pending')
      table.decimal('progress_percentage', 5, 2).nullable()
      table.bigInteger('progress_size_left_bytes').nullable()
      table.timestamp('progress_eta', { useTz: true }).nullable()
      table.text('progress_step_label').nullable()
      table.text('failure_reason').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['kind', 'external_id_scheme', 'external_id_value'])
      table.index(['requested_by_user_id'])
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint media_requests_kind_check ` +
        "check (kind in ('movie', 'series', 'album'))",
    )
    this.schema.raw(
      `alter table ${this.tableName} add constraint media_requests_external_id_scheme_check ` +
        "check (external_id_scheme in ('tmdb', 'tvdb', 'musicbrainz'))",
    )
    this.schema.raw(
      `alter table ${this.tableName} add constraint media_requests_status_check ` +
        "check (status in ('pending', 'submitted', 'downloading', 'importing', 'available', 'failed', 'cancelled'))",
    )
    this.schema.raw(
      `create index media_requests_status_active_idx on ${this.tableName} (status) ` +
        "where status in ('submitted', 'downloading', 'importing')",
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

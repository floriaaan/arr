import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'servarr_instances'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('kind').notNullable()
      table.text('base_url').notNullable()
      table.text('api_key_encrypted').notNullable()
      table.text('root_folder_path').nullable()
      table.integer('quality_profile_id').nullable()
      table.integer('metadata_profile_id').nullable()
      table.integer('language_profile_id').nullable()
      table.boolean('enabled').notNullable().defaultTo(false)
      table.timestamp('last_health_check_at', { useTz: true }).nullable()
      table.boolean('last_health_check_ok').nullable()
      table.text('last_health_check_error_type').nullable()
      table.text('last_health_check_error_message').nullable()
      table.text('detected_version').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['kind'])
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint servarr_instances_kind_check check (kind in ('radarr', 'sonarr', 'lidarr'))`,
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

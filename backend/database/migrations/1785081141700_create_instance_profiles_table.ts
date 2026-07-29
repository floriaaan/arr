import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'instance_profiles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('instance_id')
        .notNullable()
        .references('id')
        .inTable('servarr_instances')
        .onDelete('CASCADE')
      table.string('name', 64).notNullable()
      table.text('root_folder_path').notNullable()
      table.integer('quality_profile_id').notNullable()
      table.integer('metadata_profile_id').nullable()
      table.integer('language_profile_id').nullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['instance_id', 'name'])
    })

    this.schema.raw(
      `create unique index uq_instance_profiles_default_per_instance on ${this.tableName} (instance_id) where is_default`,
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

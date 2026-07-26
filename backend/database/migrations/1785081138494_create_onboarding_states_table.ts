import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'onboarding_state'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.text('status').notNullable().defaultTo('not_started')
      table.timestamp('admin_created_at', { useTz: true }).nullable()
      table.timestamp('services_configured_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.schema.raw(
      `alter table ${this.tableName} add constraint onboarding_state_status_check ` +
        "check (status in ('not_started', 'admin_created', 'services_configured', 'completed'))",
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

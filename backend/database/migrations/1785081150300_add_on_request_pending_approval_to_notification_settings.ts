import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('on_request_pending_approval').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('on_request_pending_approval')
    })
  }
}

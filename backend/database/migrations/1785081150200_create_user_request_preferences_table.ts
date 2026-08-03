import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_request_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.text('user_id').primary().references('id').inTable('user')
      table.boolean('auto_approve').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

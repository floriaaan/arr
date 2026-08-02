import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('auth_mode').notNullable().defaultTo('none')
      /** Encrypted, like `webhook_url_encrypted` — a bearer token is a write token. */
      table.text('token_encrypted').nullable()
      table.string('username').nullable()
      /** Encrypted, like `token_encrypted`. */
      table.text('password_encrypted').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('auth_mode')
      table.dropColumn('token_encrypted')
      table.dropColumn('username')
      table.dropColumn('password_encrypted')
    })
  }
}

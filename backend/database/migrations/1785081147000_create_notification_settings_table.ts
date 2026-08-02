import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      /**
       * Encrypted like the OIDC client secret: a Discord webhook URL is a
       * write token, not a public address (cf.
       * docs/phase-6-fiabilite-requests/02, chantier 2 décision 4).
       */
      table.text('webhook_url_encrypted').nullable()
      table.boolean('on_request_available').notNullable().defaultTo(true)
      table.boolean('on_request_failed').notNullable().defaultTo(true)
      table.boolean('on_instance_unreachable').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

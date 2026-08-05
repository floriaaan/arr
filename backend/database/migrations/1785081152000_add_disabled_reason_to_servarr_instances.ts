import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'servarr_instances'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('disabled_reason').nullable()
    })
    this.schema.raw(
      `alter table ${this.tableName} add constraint servarr_instances_disabled_reason_check check (disabled_reason in ('admin', 'health_check'))`,
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('disabled_reason')
    })
  }
}

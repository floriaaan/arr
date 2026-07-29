import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('servarr_instances', (table) => {
      table.text('series_type').nullable()
      table.text('minimum_availability').nullable()
    })
    this.schema.alterTable('instance_profiles', (table) => {
      table.text('series_type').nullable()
      table.text('minimum_availability').nullable()
    })
  }

  async down() {
    this.schema.alterTable('servarr_instances', (table) => {
      table.dropColumn('series_type')
      table.dropColumn('minimum_availability')
    })
    this.schema.alterTable('instance_profiles', (table) => {
      table.dropColumn('series_type')
      table.dropColumn('minimum_availability')
    })
  }
}

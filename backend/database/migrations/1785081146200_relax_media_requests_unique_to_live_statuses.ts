import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The original `unique(kind, external_id_scheme, external_id_value)` blocked a
 * title *forever* once a request for it was cancelled or failed — a single bad
 * grab condemned the movie for everyone. The invariant worth keeping is only
 * "no two live requests for the same title", so the constraint becomes a
 * partial unique index over the statuses that are actually live
 * (cf. docs/phase-6-fiabilite-requests, chantier 2).
 */
export default class extends BaseSchema {
  protected tableName = 'media_requests'

  /** Mirrors `LIVE_STATUSES` in `media-request.repository.ts` — keep both in sync. */
  private readonly liveStatuses = "'pending', 'submitted', 'downloading', 'importing', 'available'"

  private readonly indexName = 'media_requests_live_external_id_unique'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['kind', 'external_id_scheme', 'external_id_value'])
    })

    this.schema.raw(
      `create unique index ${this.indexName} on ${this.tableName} ` +
        `(kind, external_id_scheme, external_id_value) ` +
        `where status in (${this.liveStatuses})`,
    )
  }

  async down() {
    this.schema.raw(`drop index if exists ${this.indexName}`)
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['kind', 'external_id_scheme', 'external_id_value'])
    })
  }
}

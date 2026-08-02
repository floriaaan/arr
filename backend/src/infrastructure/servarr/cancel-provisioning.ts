import type { BaseServarrClient } from './base-servarr-client.js'

/**
 * Shared by the three adapters' `cancel()`: the queue-drop call is identical
 * everywhere except for the api prefix.
 *
 * `blocklist=false` on purpose — blocklisting a release is a quality decision,
 * not something "I changed my mind" should trigger (cf.
 * docs/phase-6-fiabilite-requests, chantier 3 décision 1).
 */
export async function removeFromQueue(
  client: BaseServarrClient,
  apiPrefix: string,
  queueItemIds: number[],
): Promise<void> {
  for (const queueItemId of queueItemIds) {
    await client.request({
      method: 'DELETE',
      path: `${apiPrefix}/queue/${queueItemId}`,
      query: { removeFromClient: 'true', blocklist: 'false' },
    })
  }
}

/**
 * The *arr APIs take the whole resource back on PUT, so unmonitoring means
 * "read it, flip the flag, write it back". Without this the instance simply
 * re-searches the title minutes later and the cancellation doesn't hold.
 */
export async function unmonitorItem(
  client: BaseServarrClient,
  itemPath: string,
  item: Record<string, unknown>,
): Promise<void> {
  await client.request({
    method: 'PUT',
    path: itemPath,
    body: { ...item, monitored: false },
  })
}

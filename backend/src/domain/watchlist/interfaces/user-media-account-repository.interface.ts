import type { UserMediaAccount } from '../user-media-account.aggregate.js'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export interface UserMediaAccountRepository {
  findById(id: string): Promise<UserMediaAccount | null>
  findByUserAndKind(userId: string, kind: MediaServerKind): Promise<UserMediaAccount | null>
  findByUser(userId: string): Promise<UserMediaAccount[]>
  /** What `watchlist:sync` iterates over. */
  findAllWatchlistEnabled(): Promise<UserMediaAccount[]>
  /** Every linked account, for the admin diagnostics table. */
  findAll(): Promise<UserMediaAccount[]>
  save(account: UserMediaAccount): Promise<void>
  delete(id: string): Promise<void>
}

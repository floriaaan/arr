import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'

export interface ApprovalActor {
  id: string
  isAdmin: boolean
}

/**
 * Shared by `CreateRequest` (manual) and `SyncWatchlist` (watchlist) — one
 * gate for both origins (cf. docs/phase-7-watchlist-sync, chantier 4).
 * Precedence: admin always bypasses, then the per-user override, then the
 * global per-kind policy.
 */
export async function resolveRequiresApproval(
  actor: ApprovalActor,
  kind: MediaKind,
  approvalSettings: RequestApprovalSettingsRepository,
  userPreferences: UserRequestPreferencesRepository,
): Promise<boolean> {
  if (actor.isAdmin) return false

  const override = await userPreferences.getAutoApprove(actor.id)
  if (override !== null) return !override

  const settings = await approvalSettings.get()
  return settings.policyFor(kind) === 'manual'
}

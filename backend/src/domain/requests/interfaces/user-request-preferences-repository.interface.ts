/**
 * One flag per user, not an aggregate: there is nothing else here and no
 * invariant to protect (cf. `MediaServer`, similarly thin). `null` means "no
 * override — follow `RequestApprovalSettings.policyFor(kind)`".
 */
export interface UserRequestPreferencesRepository {
  getAutoApprove(userId: string): Promise<boolean | null>
  setAutoApprove(userId: string, autoApprove: boolean | null): Promise<void>
  /** Every user with an explicit override — used to annotate the admin Users list. */
  listAll(): Promise<Record<string, boolean | null>>
}

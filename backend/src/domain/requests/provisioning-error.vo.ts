export type ProvisioningErrorType =
  'already_exists' | 'instance_unavailable' | 'validation_failed' | 'unknown'

export interface ProvisioningError {
  readonly type: ProvisioningErrorType
  readonly message: string
}

import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'

export interface SaveInstanceVariables {
  kind: ServarrKind
  draft: InstanceDraft
  /** Onboarding and the admin settings panel save to different endpoints. */
  duringOnboarding?: boolean
}

export const saveInstanceMutation = defineMutation<
  Result<ServarrInstanceDto, ApiError>,
  SaveInstanceVariables
>({
  mutationFn: (connector, { kind, draft, duringOnboarding }) =>
    duringOnboarding
      ? connector.saveOnboardingInstance(kind, draft)
      : connector.saveInstance(kind, draft),
})

export function useSaveInstance() {
  return useDomainMutation(saveInstanceMutation)
}

import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { MediaServerDraft, MediaServerDto, MediaServerKind } from '#domain/settings/media-server'

export interface SaveMediaServerVariables {
  kind: MediaServerKind
  draft: MediaServerDraft
  /** Onboarding and the admin settings panel save to different endpoints. */
  duringOnboarding?: boolean
}

export const saveMediaServerMutation = defineMutation<
  Result<MediaServerDto, ApiError>,
  SaveMediaServerVariables
>({
  mutationFn: (connector, { kind, draft, duringOnboarding }) =>
    duringOnboarding
      ? connector.saveOnboardingMediaServer(kind, draft)
      : connector.saveMediaServer(kind, draft),
})

export function useSaveMediaServer() {
  return useDomainMutation(saveMediaServerMutation)
}

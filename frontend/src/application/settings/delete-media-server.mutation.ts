import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { MediaServerKind } from '#domain/settings/media-server'

export const deleteMediaServerMutation = defineMutation<void, MediaServerKind>({
  mutationFn: (connector, kind) => connector.deleteMediaServer(kind),
})

export function useDeleteMediaServer() {
  return useDomainMutation(deleteMediaServerMutation)
}

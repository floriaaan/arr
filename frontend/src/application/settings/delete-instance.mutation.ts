import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export const deleteInstanceMutation = defineMutation<void, ServarrKind>({
  mutationFn: (connector, kind) => connector.deleteInstance(kind),
})

export function useDeleteInstance() {
  return useDomainMutation(deleteInstanceMutation)
}

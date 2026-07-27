import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'

export const signOutMutation = defineMutation<void, void>({
  mutationFn: (connector) => connector.signOut(),
})

export function useSignOut() {
  return useDomainMutation(signOutMutation)
}

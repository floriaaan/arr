import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'

export interface SetUserAutoApproveVariables {
  userId: string
  autoApprove: boolean | null
}

export const setUserAutoApproveMutation = defineMutation<void, SetUserAutoApproveVariables>({
  mutationFn: (connector, { userId, autoApprove }) =>
    connector.setUserAutoApprove(userId, autoApprove),
})

export function useSetUserAutoApprove() {
  return useDomainMutation(setUserAutoApproveMutation)
}

import { useMutation } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'
import { useArrConnector } from './connector-context'
import type { MutationDescriptor } from './define-mutation'

export function useDomainMutation<TResult, TVariables = void>(
  descriptor: MutationDescriptor<TResult, TVariables>,
  options?: Omit<UseMutationOptions<TResult, Error, TVariables>, 'mutationFn'>,
) {
  const connector = useArrConnector()
  return useMutation({
    mutationFn: (variables: TVariables) => descriptor.mutationFn(connector, variables),
    ...options,
  })
}

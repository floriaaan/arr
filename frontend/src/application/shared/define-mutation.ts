import type { ArrConnector } from '#domain/interfaces/arr-connector'

export interface MutationDescriptor<TResult, TVariables> {
  mutationFn: (connector: ArrConnector, variables: TVariables) => Promise<TResult>
}

export function defineMutation<TResult, TVariables = void>(
  descriptor: MutationDescriptor<TResult, TVariables>,
): MutationDescriptor<TResult, TVariables> {
  return descriptor
}

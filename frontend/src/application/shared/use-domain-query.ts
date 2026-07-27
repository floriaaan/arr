import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { useArrConnector } from './connector-context'
import type { QueryDescriptor } from './define-query'

export function useDomainQuery<TResult, TArgs extends readonly unknown[]>(
  descriptor: QueryDescriptor<TResult, TArgs>,
  args: TArgs,
  options?: Omit<UseQueryOptions<TResult>, 'queryKey' | 'queryFn'>,
) {
  const connector = useArrConnector()
  return useQuery({
    queryKey: descriptor.key(...args),
    queryFn: () => descriptor.queryFn(connector, ...args),
    ...options,
  })
}

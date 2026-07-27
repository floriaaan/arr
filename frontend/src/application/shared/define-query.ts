import type { ArrConnector } from '#domain/interfaces/arr-connector'

export interface QueryDescriptor<TResult, TArgs extends readonly unknown[]> {
  key: (...args: TArgs) => readonly unknown[]
  queryFn: (connector: ArrConnector, ...args: TArgs) => Promise<TResult>
}

/** Just names the shape — the connector is injected by `useDomainQuery`, not here. */
export function defineQuery<TResult, TArgs extends readonly unknown[] = []>(
  descriptor: QueryDescriptor<TResult, TArgs>,
): QueryDescriptor<TResult, TArgs> {
  return descriptor
}

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ArrConnector } from '#domain/interfaces/arr-connector'

/**
 * No screen imports `infrastructure/http` or `infrastructure/fake` directly
 * — only this context (enforced by `dependency-cruiser`). The connector
 * itself is selected outside `src/`, in `providers/create-connector.ts`,
 * since `application` may not depend on `infrastructure` either.
 */
const ArrConnectorReactContext = createContext<ArrConnector | null>(null)

export function ArrConnectorProvider({
  children,
  connector,
}: {
  children: ReactNode
  connector: ArrConnector
}) {
  return (
    <ArrConnectorReactContext.Provider value={connector}>
      {children}
    </ArrConnectorReactContext.Provider>
  )
}

export function useArrConnector(): ArrConnector {
  const connector = useContext(ArrConnectorReactContext)
  if (!connector) throw new Error('useArrConnector() called outside <ArrConnectorProvider>.')
  return connector
}

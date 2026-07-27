import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { ArrConnectorProvider } from '#application/shared/connector-context'
import { createConnector } from '../../providers/create-connector'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

/**
 * Server-side loaders need the incoming request's session cookie to call
 * the backend as the visitor (cf. docs/phase-5 decision 3) — `fetch` has no
 * access to the browser's cookie jar when it runs on the Node server.
 */
const getCookieHeader = createIsomorphicFn()
  .server(() => getRequestHeader('cookie'))
  .client(() => undefined)

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const connector = createConnector(getCookieHeader())

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ArrConnectorProvider connector={connector}>{children}</ArrConnectorProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

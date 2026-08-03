import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from '#presentation/ui/sonner'
import { ThemeProvider } from '#presentation/shared/theme-provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { ArrConnectorProvider } from '#application/shared/connector-context'
import { createConnector, getCookieHeader } from '../../providers/create-connector'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

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
        name: 'color-scheme',
        content: 'light dark',
      },
      {
        title: 'arr',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/logo.svg',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const connector = createConnector(getCookieHeader())

  return (
    /* `suppressHydrationWarning`: next-themes writes the `class` on <html>
       from an inline script before React hydrates, which React would
       otherwise report as a mismatch. */
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <ArrConnectorProvider connector={connector}>
            {children}
            <Toaster />
          </ArrConnectorProvider>
        </ThemeProvider>
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

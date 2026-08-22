import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from '#presentation/ui/sonner'
import { ThemeProvider } from '#presentation/shared/theme-provider'
import { OfflineBanner } from '#presentation/shared/offline-banner'

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
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: 'any',
      },
      {
        rel: 'icon',
        href: '/logo.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon-180x180.png',
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
        {/* Rendered as literal tags rather than through `head()`'s `meta` array:
            TanStack Router's HeadContent dedupes route meta by `name`/`property`
            (see @tanstack/react-router's headContentUtils `metaByAttribute`
            tracking), so two entries both named `theme-color` collapse to just
            one at render time — the light-mode variant silently disappeared
            when both were in that array. Browsers support multiple
            `theme-color` metas differentiated by `media`, so they're declared
            directly here instead. */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <HeadContent />
      </head>
      <body>
        {/* This `flex h-dvh flex-col` column is the single place `h-dvh` is
            claimed in the whole document — `OfflineBanner` (sticky,
            non-scrolling) and `AppShell` (`flex-1 min-h-0`) are siblings
            here and split that one viewport height between them, instead of
            both claiming a full `100dvh` and pushing the document taller
            than the viewport while the banner is visible. */}
        <div className="flex h-dvh flex-col">
          <OfflineBanner />
          <ThemeProvider>
            <ArrConnectorProvider connector={connector}>
              {children}
              <Toaster />
            </ArrConnectorProvider>
          </ThemeProvider>
        </div>
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

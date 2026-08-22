import type { VitePWAOptions } from 'vite-plugin-pwa'

/**
 * Exported as plain data — not called inline in vite.config.ts — so it's
 * unit-testable without booting Vite (cf.
 * tests/presentation/vite-pwa-config.spec.ts).
 *
 * Manifest generation only. No `workbox`/`registerType`/`injectRegister` —
 * vite-plugin-pwa cannot produce a service worker under this build (see the
 * plan's Task 2 amendment); configuring SW-only options here would be dead,
 * misleading config for a file that's never written.
 */
export const pwaOptions: Partial<VitePWAOptions> = {
  outDir: 'dist/client',
  injectRegister: null,
  manifest: {
    id: '/',
    name: 'arr',
    short_name: 'arr',
    description:
      'One search box, one request queue, one login for Radarr/Sonarr/Lidarr — a quiet, honest control panel.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Approximations of the --background oklch tokens in styles.css —
    // theme-color has no oklch support across browsers yet.
    background_color: '#ffffff',
    theme_color: '#ffffff',
    orientation: 'any',
    categories: ['entertainment', 'utilities'],
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
}

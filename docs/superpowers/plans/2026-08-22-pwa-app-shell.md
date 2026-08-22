# PWA App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `arr`'s frontend installable (manifest + icons, standalone display, install button, offline-status banner).

> **Amended mid-implementation (2026-08-22):** the "resilient to a dropped
> connection" / offline-app-shell half of the original goal is dropped.
> `vite-plugin-pwa` cannot generate a service worker at all under TanStack
> Start's build — confirmed root cause and two matching open upstream
> issues in Task 2's report; see the design spec's own amendment note. User
> decision: ship installable-only now. **Task 3 (offline fallback page) and
> Task 9 (update/offline-ready toasts) are dropped** — their bodies below
> are replaced with a short notice; do not implement them. `OfflineBanner`/
> `ConnectivityMonitor` (Tasks 4-6) are unaffected — they track
> `navigator.onLine` directly and never depended on a service worker.
> **Believed unaffected, not yet device-verified:** `InstallPromptController`/
> `InstallAppButton` (Tasks 7-8), pending a real check of whether this
> Chrome version still gates `beforeinstallprompt` on a registered service
> worker with a fetch handler (historically a Chromium installability
> criterion). If it does, `canInstall()` is permanently `false` on
> desktop/Android and only the iOS-hint branch is ever live — see Task 10's
> manual-verification note.

**Architecture:** `vite-plugin-pwa` generates the manifest only (no service worker — see amendment above) from a config module (`vite-pwa.config.ts`) that's importable and unit-testable outside of Vite. `@vite-pwa/assets-generator` rasterizes the existing `public/logo.svg` into the full icon set once, as a committed static asset, not a build step. Two small interfaces (`ConnectivityMonitor`, `InstallPromptController`) wrap the browser APIs that have no framework equivalent yet, each with a fake test double, following the same interface+fake shape as `ArrConnector`/`FakeArrConnector` — but living in `presentation/shared/`, not `domain/`, since these are browser-platform concerns, not business ports (same layering `next-themes`'s `useTheme` already gets in this codebase).

**Tech Stack:** `vite-plugin-pwa` (registry-confirmed `1.3.0`, manifest generation only), `@vite-pwa/assets-generator` (registry-confirmed `1.0.2`), React 19, Vitest + `@testing-library/react` (already a devDependency, unused until this plan — no existing component-render test to follow, this introduces the first one).

## Global Constraints

- **Frontend-only.** No backend changes anywhere in this plan.
- **No service worker.** `vite-plugin-pwa` is confirmed incapable of generating one under this build (Task 2 finding) — don't configure `workbox`, `registerType`, or anything implying SW behavior; it would be dead/misleading config for a file that's never produced.
- **No domain-layer changes.** `ConnectivityMonitor`/`InstallPromptController` are browser-platform concerns, not business ports; they live in `presentation/shared/`.
- **Icon generation is a one-off dev script**, not part of `task build`. Its output is committed like any other static asset in `public/`.
- **Match existing conventions:** kebab-case filenames under `src/`, `#presentation/*` import alias (no extension, per `frontend`'s convention — contrast the backend's `.js`-suffixed ESM imports), Prettier (no semicolons, single quotes, trailing commas, 100 cols) via `task format`, strict TypeScript with no `any`.
- **`task check` (lint + typecheck + test + boundaries) must pass before any task is considered done.**

---

### Task 1: Install PWA tooling and generate the icon set

**Files:**
- Modify: `frontend/package.json` (add `vite-plugin-pwa`, `@vite-pwa/assets-generator` devDependencies; add `generate-pwa-assets` script)
- Create: `frontend/pwa-assets.config.ts`
- Create (generated, committed): `frontend/public/favicon.ico`, `frontend/public/apple-touch-icon-180x180.png`, `frontend/public/pwa-64x64.png`, `frontend/public/pwa-192x192.png`, `frontend/public/pwa-512x512.png`, `frontend/public/maskable-icon-512x512.png`

**Interfaces:**
- Produces: the exact icon filenames above, referenced by name in Task 2's manifest config and Task 6's head links. Later tasks must use these filenames verbatim — don't rename them.

> **Amended after Task 1's real run** (`@vite-pwa/assets-generator@1.0.2`,
> `minimal2023Preset`): the installed version generates **6 files, not 7** —
> no separate `favicon.svg`. Its own printed output recommends the SVG
> favicon link point at the project's existing `public/logo.svg` directly:
> `<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/logo.svg" type="image/svg+xml">`.
> Task 6 uses this exact real-tool-recommended snippet (not the `favicon.svg`
> + `sizes="48x48"` version originally drafted from fetched docs, which
> didn't match this version's actual behavior).

- [ ] **Step 1: Add the dependencies**

```bash
cd frontend
pnpm add -D vite-plugin-pwa@^1.3.0 @vite-pwa/assets-generator@^1.0.2
```

- [ ] **Step 2: Add the generation script to `package.json`**

In the `scripts` block, alongside the existing entries:

```json
"generate-pwa-assets": "pwa-assets-generator"
```

- [ ] **Step 3: Write `pwa-assets.config.ts`**

```typescript
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset,
  images: ['public/logo.svg'],
})
```

- [ ] **Step 4: Run the generator**

```bash
pnpm run generate-pwa-assets
```

- [ ] **Step 5: Verify the exact output files exist**

```bash
ls public/favicon.ico public/apple-touch-icon-180x180.png \
   public/pwa-64x64.png public/pwa-192x192.png public/pwa-512x512.png \
   public/maskable-icon-512x512.png
```

Expected: all six files listed, no "No such file" errors. (An earlier run of this task found the installed `@vite-pwa/assets-generator@1.0.2` + `minimal2023Preset` produces exactly these six — no separate `favicon.svg`; its own recommended favicon markup uses the existing `logo.svg` directly, wired in Task 6.) If a future run of this step produces a different file list than these six, stop and reconcile Task 2/6 to the actual names before proceeding — don't rename the generated files to match a guess.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json pnpm-lock.yaml frontend/pwa-assets.config.ts frontend/public/favicon.ico frontend/public/apple-touch-icon-180x180.png frontend/public/pwa-64x64.png frontend/public/pwa-192x192.png frontend/public/pwa-512x512.png frontend/public/maskable-icon-512x512.png
git commit -m "feat(frontend): generate PWA icon set from logo.svg"
```

Note: the lockfile lives at the repo root (pnpm workspace), not inside `frontend/` — `pnpm add` from within `frontend/` still updates the root lockfile.

---

### Task 2: `vite-pwa.config.ts` (manifest only) and wiring into `vite.config.ts`

> **Rewritten after the Task 2 blocker** (see plan header amendment):
> `vite-plugin-pwa` cannot generate a service worker under this build at
> all — confirmed by the first implementer attempt, root-caused to a shared
> mutable config object across Vite's Environment-API client/ssr builds.
> `manifest.webmanifest` generation is unaffected (it goes through a
> different, working hook) and is the entire scope of this task now. No
> `workbox`, `registerType`, or `injectRegister` config — none of it does
> anything without a service worker to register, and leaving it in would
> misleadingly imply behavior that can't happen.

**Files:**
- Create: `frontend/vite-pwa.config.ts`
- Modify: `frontend/vite.config.ts`
- Test: `frontend/tests/presentation/vite-pwa-config.spec.ts`

**Interfaces:**
- Produces: `pwaOptions: Partial<import('vite-plugin-pwa').VitePWAOptions>`, imported by `vite.config.ts` (Step 4 below) and by Task 6 (which reads `pwaOptions.manifest` fields to keep head tags consistent, though it doesn't import the object directly — see Task 6).

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/tests/presentation/vite-pwa-config.spec.ts
import { describe, test, expect } from 'vitest'
import { pwaOptions } from '../../vite-pwa.config'

describe('pwaOptions', () => {
  test('manifest has the required installability fields', () => {
    const manifest = pwaOptions.manifest
    if (!manifest) throw new Error('expected pwaOptions.manifest to be set')

    expect(manifest.name).toBe('arr')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')

    const icons = manifest.icons ?? []
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    expect(icons.some((icon) => icon.sizes === '512x512' && icon.purpose !== 'maskable')).toBe(
      true,
    )
  })

  test('no service-worker config — vite-plugin-pwa cannot generate one under this build', () => {
    expect(pwaOptions.workbox).toBeUndefined()
    expect(pwaOptions.registerType).toBeUndefined()
  })
})
```

(`pwaOptions.manifest`'s type is `false | Partial<ManifestOptions>` — manifest generation can be disabled — so `manifest?.name` alone doesn't narrow out `false` under strict TypeScript. The explicit `if (!manifest) throw` guard above is required, not optional style.)

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm test -- vite-pwa-config
```

Expected: FAIL — `../../vite-pwa.config` doesn't exist yet.

- [ ] **Step 3: Write `vite-pwa.config.ts`**

```typescript
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
  manifest: {
    id: '/',
    name: 'arr',
    short_name: 'arr',
    description:
      "One search box, one request queue, one login for Radarr/Sonarr/Lidarr — a quiet, honest control panel.",
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test -- vite-pwa-config
```

Expected: PASS (2 tests).

- [ ] **Step 5: Wire the plugin into `vite.config.ts`**

Modify `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './vite-pwa.config'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), VitePWA(pwaOptions)],
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
})

export default config
```

- [ ] **Step 6: Typecheck**

```bash
cd frontend && pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Build and verify the actual output**

```bash
pnpm run build
ls dist/client/manifest.webmanifest
find dist -iname "*sw*" -o -iname "*workbox*"
```

Expected: `manifest.webmanifest` exists under `dist/client`; the `find` prints nothing (confirming no service-worker artifact is generated — expected and correct given this task's scope, not a bug to chase).

- [ ] **Step 8: Commit**

```bash
git add frontend/vite-pwa.config.ts frontend/vite.config.ts frontend/tests/presentation/vite-pwa-config.spec.ts
git commit -m "feat(frontend): configure vite-plugin-pwa (manifest only)"
```

---

### Task 3: Offline fallback page — DROPPED

Dropped in the same amendment as Task 2's rewrite: there is no service
worker to reference this page (`navigateFallback` was the only consumer of
`offline.html`, and that Workbox config no longer exists). Do not implement
this task. If offline caching is revisited in a future spec, this page's
content can be resurrected from git history at need.

<details>
<summary>Original task body (kept for history, not to be implemented)</summary>

**Files:**
- Create: `frontend/public/offline.html`

**Interfaces:**
- Produces: a static file at `/offline.html`, referenced by `pwaOptions.workbox.navigateFallback` (already wired in Task 2).

**Step 1 (not run):** would have written `offline.html` with this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>arr — offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: #ffffff;
        color: #09090b;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #09090b;
          color: #fafafa;
        }
      }
      main {
        max-width: 24rem;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
      }
      p {
        font-size: 0.875rem;
        color: #71717a;
        margin: 0 0 1.5rem;
      }
      button {
        border: 1px solid #e4e4e7;
        background: transparent;
        color: inherit;
        padding: 0.5rem 1rem;
        font: inherit;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>You're offline</h1>
      <p>arr couldn't reach the server, and this page hasn't been cached yet.</p>
      <button onclick="location.reload()">Retry</button>
    </main>
  </body>
</html>
```

**Step 2 (not run):** would have verified `dist/client/offline.html` after
build.

**Step 3 (not run):** would have committed as
`feat(frontend): add static offline fallback page`.

</details>

---

### Task 4: `ConnectivityMonitor` (interface, browser implementation, fake)

**Files:**
- Create: `frontend/src/presentation/shared/connectivity-monitor.ts`
- Create: `frontend/src/presentation/shared/fake-connectivity-monitor.ts`
- Test: `frontend/tests/presentation/fake-connectivity-monitor.spec.ts`

**Interfaces:**
- Produces: `interface ConnectivityMonitor { isOnline(): boolean; subscribe(callback: (online: boolean) => void): () => void }`, `browserConnectivityMonitor: ConnectivityMonitor`, `createFakeConnectivityMonitor(initialOnline?: boolean): ConnectivityMonitor & { setOnline(online: boolean): void }`. Task 5 consumes all three.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/tests/presentation/fake-connectivity-monitor.spec.ts
import { describe, test, expect, vi } from 'vitest'
import { createFakeConnectivityMonitor } from '#presentation/shared/fake-connectivity-monitor'

describe('createFakeConnectivityMonitor', () => {
  test('defaults to online', () => {
    expect(createFakeConnectivityMonitor().isOnline()).toBe(true)
  })

  test('starts offline when told to', () => {
    expect(createFakeConnectivityMonitor(false).isOnline()).toBe(false)
  })

  test('notifies subscribers when setOnline is called', () => {
    const monitor = createFakeConnectivityMonitor(true)
    const callback = vi.fn()
    monitor.subscribe(callback)

    monitor.setOnline(false)

    expect(callback).toHaveBeenCalledWith(false)
    expect(monitor.isOnline()).toBe(false)
  })

  test('unsubscribe stops further notifications', () => {
    const monitor = createFakeConnectivityMonitor(true)
    const callback = vi.fn()
    const unsubscribe = monitor.subscribe(callback)

    unsubscribe()
    monitor.setOnline(false)

    expect(callback).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && pnpm test -- fake-connectivity-monitor
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `connectivity-monitor.ts`**

```typescript
export interface ConnectivityMonitor {
  isOnline(): boolean
  subscribe(callback: (online: boolean) => void): () => void
}

/**
 * The real thing — wraps `navigator.onLine` and the `online`/`offline`
 * window events. Guarded for SSR: this app server-renders every route, and
 * neither `navigator` nor `window` exists there.
 *
 * `navigator.onLine` only reflects whether the OS/browser thinks it has a
 * network interface, not whether the backend is actually reachable — a
 * coarser signal than TanStack Query's own retry/error state, but the right
 * one for "should an offline banner show at all".
 */
export const browserConnectivityMonitor: ConnectivityMonitor = {
  isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine
  },
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {}

    function online() {
      callback(true)
    }
    function offline() {
      callback(false)
    }

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  },
}
```

- [ ] **Step 4: Write `fake-connectivity-monitor.ts`**

```typescript
import type { ConnectivityMonitor } from './connectivity-monitor'

/**
 * Test double — mirrors `infrastructure/fake/fake-arr-connector.ts`'s
 * shape. `setOnline` drives it directly instead of dispatching real browser
 * events, so tests don't depend on jsdom's limited online/offline event
 * support.
 */
export function createFakeConnectivityMonitor(
  initialOnline = true,
): ConnectivityMonitor & { setOnline(online: boolean): void } {
  let online = initialOnline
  const listeners = new Set<(online: boolean) => void>()

  return {
    isOnline() {
      return online
    },
    subscribe(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    setOnline(next) {
      online = next
      for (const listener of listeners) listener(next)
    },
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test -- fake-connectivity-monitor
```

Expected: PASS (4 tests).

- [ ] **Step 6: Lint and typecheck**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/presentation/shared/connectivity-monitor.ts frontend/src/presentation/shared/fake-connectivity-monitor.ts frontend/tests/presentation/fake-connectivity-monitor.spec.ts
git commit -m "feat(frontend): add ConnectivityMonitor port + fake"
```

---

### Task 5: `useOnlineStatus` hook and `OfflineBanner`

**Files:**
- Create: `frontend/src/presentation/shared/use-online-status.ts`
- Create: `frontend/src/presentation/shared/offline-banner.tsx`
- Test: `frontend/tests/presentation/offline-banner.spec.tsx`

**Interfaces:**
- Consumes: `ConnectivityMonitor`, `browserConnectivityMonitor`, `createFakeConnectivityMonitor` (Task 4).
- Produces: `useOnlineStatus(monitor?: ConnectivityMonitor): boolean`; `OfflineBanner(props: { monitor?: ConnectivityMonitor }): JSX.Element | null`. Task 6 renders `<OfflineBanner />` with no props (production default).

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/tests/presentation/offline-banner.spec.tsx
import { describe, test, expect, afterEach } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { OfflineBanner } from '#presentation/shared/offline-banner'
import { createFakeConnectivityMonitor } from '#presentation/shared/fake-connectivity-monitor'

afterEach(() => cleanup())

describe('OfflineBanner', () => {
  test('renders nothing while online', () => {
    const monitor = createFakeConnectivityMonitor(true)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  test('shows the banner once offline', () => {
    const monitor = createFakeConnectivityMonitor(false)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  test('hides again once back online', () => {
    const monitor = createFakeConnectivityMonitor(false)
    render(<OfflineBanner monitor={monitor} />)
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()

    act(() => monitor.setOnline(true))

    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && pnpm test -- offline-banner
```

Expected: FAIL — `offline-banner` module doesn't exist.

- [ ] **Step 3: Write `use-online-status.ts`**

```typescript
import { useEffect, useState } from 'react'
import { browserConnectivityMonitor } from './connectivity-monitor'
import type { ConnectivityMonitor } from './connectivity-monitor'

export function useOnlineStatus(
  monitor: ConnectivityMonitor = browserConnectivityMonitor,
): boolean {
  const [online, setOnline] = useState(() => monitor.isOnline())

  useEffect(() => {
    setOnline(monitor.isOnline())
    return monitor.subscribe(setOnline)
  }, [monitor])

  return online
}
```

- [ ] **Step 4: Write `offline-banner.tsx`**

```tsx
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from './use-online-status'
import type { ConnectivityMonitor } from './connectivity-monitor'

/**
 * Rendered once at the document root (cf. __root.tsx), not per-shell — one
 * integration point covers login/setup and every AppShell page uniformly.
 * Reuses existing neutral/status tokens, no new visual system.
 */
export function OfflineBanner({ monitor }: { monitor?: ConnectivityMonitor }) {
  const online = useOnlineStatus(monitor)

  if (online) return null

  return (
    <div className="flex items-center justify-center gap-2 border-b bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <WifiOff className="size-3.5 shrink-0" />
      You're offline — some data may be out of date.
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test -- offline-banner
```

Expected: PASS (3 tests).

- [ ] **Step 6: Lint and typecheck**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/presentation/shared/use-online-status.ts frontend/src/presentation/shared/offline-banner.tsx frontend/tests/presentation/offline-banner.spec.tsx
git commit -m "feat(frontend): add useOnlineStatus hook and OfflineBanner"
```

---

### Task 6: Wire manifest, icon/theme-color head tags, and `OfflineBanner` into `__root.tsx`

**Files:**
- Modify: `frontend/src/routes/__root.tsx`

**Interfaces:**
- Consumes: `OfflineBanner` (Task 5).

- [ ] **Step 1: Update the `head()` meta/links**

In `frontend/src/routes/__root.tsx`, replace the existing `head: () => ({ meta: [...], links: [...] })` with:

```typescript
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
        name: 'theme-color',
        content: '#ffffff',
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: '#09090b',
        media: '(prefers-color-scheme: dark)',
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
```

(Matches `@vite-pwa/assets-generator@1.0.2`'s own recommended markup exactly — Task 1's real run found this preset generates no separate `favicon.svg`; it expects the SVG favicon link to point at the project's existing `logo.svg` directly.) This still changes the previous entry's `sizes`/ordering — `logo.svg` keeps being used both here and elsewhere (`AppShell`'s sidebar `<img>`), now paired with the generated `favicon.ico` for raster fallback and `apple-touch-icon-180x180.png` for iOS.

- [ ] **Step 2: Render `OfflineBanner` in `RootDocument`**

Add the import and render it as the first child of `<body>`:

```tsx
import { OfflineBanner } from '#presentation/shared/offline-banner'
```

```tsx
      <body>
        <OfflineBanner />
        <ThemeProvider>
          <ArrConnectorProvider connector={connector}>
            {children}
            <Toaster />
          </ArrConnectorProvider>
        </ThemeProvider>
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && pnpm run typecheck
```

Expected: clean — confirms TanStack Start's head-meta type accepts the extra `media` attribute on a `theme-color` entry. If it rejects it, narrow the meta entry's type with an inline cast (`{ name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' } as const`) rather than dropping the dark-mode variant.

- [ ] **Step 4: Manual visual check**

```bash
cd .. && task dev:fake
```

Open `http://localhost:3000/login` — confirm the page loads with no console errors and the tab favicon still resolves. (Toggling actual offline in DevTools' Network panel and confirming the banner appears is worth doing here too, but isn't blocking for this task — Task 5's tests already cover the banner's own logic.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/__root.tsx
git commit -m "feat(frontend): wire manifest/icon head tags and OfflineBanner into root"
```

---

### Task 7: `InstallPromptController` (interface, browser implementation, fake)

**Files:**
- Create: `frontend/src/presentation/shared/install-prompt-controller.ts`
- Create: `frontend/src/presentation/shared/fake-install-prompt-controller.ts`
- Test: `frontend/tests/presentation/fake-install-prompt-controller.spec.ts`

**Interfaces:**
- Produces: `type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'`; `interface InstallPromptController { canInstall(): boolean; subscribe(callback: (canInstall: boolean) => void): () => void; prompt(): Promise<InstallOutcome> }`; `browserInstallPromptController: InstallPromptController`; `createFakeInstallPromptController(initialCanInstall?: boolean): InstallPromptController & { setCanInstall(canInstall: boolean): void; setPromptOutcome(outcome: InstallOutcome): void }`. Task 8 consumes all of these.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/tests/presentation/fake-install-prompt-controller.spec.ts
import { describe, test, expect, vi } from 'vitest'
import { createFakeInstallPromptController } from '#presentation/shared/fake-install-prompt-controller'

describe('createFakeInstallPromptController', () => {
  test('defaults to not installable', () => {
    expect(createFakeInstallPromptController().canInstall()).toBe(false)
  })

  test('prompt() resolves "unavailable" when not installable', async () => {
    const controller = createFakeInstallPromptController(false)
    expect(await controller.prompt()).toBe('unavailable')
  })

  test('prompt() resolves the configured outcome when installable', async () => {
    const controller = createFakeInstallPromptController(true)
    controller.setPromptOutcome('dismissed')
    expect(await controller.prompt()).toBe('dismissed')
  })

  test('notifies subscribers when setCanInstall changes', () => {
    const controller = createFakeInstallPromptController(false)
    const callback = vi.fn()
    controller.subscribe(callback)

    controller.setCanInstall(true)

    expect(callback).toHaveBeenCalledWith(true)
    expect(controller.canInstall()).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && pnpm test -- fake-install-prompt-controller
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `install-prompt-controller.ts`**

```typescript
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export interface InstallPromptController {
  canInstall(): boolean
  subscribe(callback: (canInstall: boolean) => void): () => void
  prompt(): Promise<InstallOutcome>
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures Chromium's `beforeinstallprompt` — the only browser family that
 * fires it. `canInstall()` is simply `false` everywhere else (iOS Safari,
 * Firefox, or once already running standalone), with no user-agent sniffing
 * needed for that part; `InstallAppButton` (Task 8) handles the iOS-hint
 * branch itself, since there's no capability signal for it at all.
 *
 * Guarded for SSR: this factory runs at module-import time, which happens
 * server-side too — `typeof window !== 'undefined'` keeps it a no-op there.
 */
function createBrowserInstallPromptController(): InstallPromptController {
  let capturedEvent: BeforeInstallPromptEvent | null = null
  const listeners = new Set<(canInstall: boolean) => void>()

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      capturedEvent = event as BeforeInstallPromptEvent
      for (const listener of listeners) listener(true)
    })
    window.addEventListener('appinstalled', () => {
      capturedEvent = null
      for (const listener of listeners) listener(false)
    })
  }

  return {
    canInstall() {
      return capturedEvent !== null
    },
    subscribe(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    async prompt() {
      if (!capturedEvent) return 'unavailable'
      await capturedEvent.prompt()
      const { outcome } = await capturedEvent.userChoice
      capturedEvent = null
      return outcome
    },
  }
}

export const browserInstallPromptController = createBrowserInstallPromptController()
```

- [ ] **Step 4: Write `fake-install-prompt-controller.ts`**

```typescript
import type { InstallOutcome, InstallPromptController } from './install-prompt-controller'

export function createFakeInstallPromptController(
  initialCanInstall = false,
): InstallPromptController & {
  setCanInstall(canInstall: boolean): void
  setPromptOutcome(outcome: InstallOutcome): void
} {
  let canInstall = initialCanInstall
  let outcome: InstallOutcome = 'accepted'
  const listeners = new Set<(canInstall: boolean) => void>()

  return {
    canInstall() {
      return canInstall
    },
    subscribe(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    async prompt() {
      return canInstall ? outcome : 'unavailable'
    },
    setCanInstall(next) {
      canInstall = next
      for (const listener of listeners) listener(next)
    },
    setPromptOutcome(next) {
      outcome = next
    },
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test -- fake-install-prompt-controller
```

Expected: PASS (4 tests).

- [ ] **Step 6: Lint and typecheck**

```bash
pnpm run lint && pnpm run typecheck
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/presentation/shared/install-prompt-controller.ts frontend/src/presentation/shared/fake-install-prompt-controller.ts frontend/tests/presentation/fake-install-prompt-controller.spec.ts
git commit -m "feat(frontend): add InstallPromptController port + fake"
```

---

### Task 8: `useInstallPrompt` hook, `InstallAppButton`, wired into Account

**Files:**
- Create: `frontend/src/presentation/shared/use-install-prompt.ts`
- Create: `frontend/src/presentation/account/install-app-button.tsx`
- Modify: `frontend/src/routes/account/index.tsx`
- Test: `frontend/tests/presentation/install-app-button.spec.tsx`

**Interfaces:**
- Consumes: `InstallPromptController`, `browserInstallPromptController`, `createFakeInstallPromptController` (Task 7).
- Produces: `useInstallPrompt(controller?: InstallPromptController): { canInstall: boolean; prompt: () => Promise<InstallOutcome> }`; `InstallAppButton(props: { controller?: InstallPromptController; isStandalone?: () => boolean; isIos?: () => boolean }): JSX.Element | null`.

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/tests/presentation/install-app-button.spec.tsx
import { describe, test, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { InstallAppButton } from '#presentation/account/install-app-button'
import { createFakeInstallPromptController } from '#presentation/shared/fake-install-prompt-controller'

afterEach(() => cleanup())

describe('InstallAppButton', () => {
  test('renders nothing when there is no install signal and the platform is not iOS', () => {
    const controller = createFakeInstallPromptController(false)
    render(<InstallAppButton controller={controller} isIos={() => false} />)
    expect(screen.queryByText('Install app')).not.toBeInTheDocument()
  })

  test('renders an install button once the browser signals it can install', () => {
    const controller = createFakeInstallPromptController(true)
    render(<InstallAppButton controller={controller} isIos={() => false} />)
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument()
  })

  test('shows iOS instructions instead of a button on iOS with no install signal', () => {
    const controller = createFakeInstallPromptController(false)
    render(<InstallAppButton controller={controller} isIos={() => true} />)
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
  })

  test('renders nothing once already installed, even if the browser could otherwise prompt', () => {
    const controller = createFakeInstallPromptController(true)
    render(
      <InstallAppButton controller={controller} isStandalone={() => true} isIos={() => false} />,
    )
    expect(screen.queryByText('Install app')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend && pnpm test -- install-app-button
```

Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write `use-install-prompt.ts`**

```typescript
import { useEffect, useState } from 'react'
import { browserInstallPromptController } from './install-prompt-controller'
import type { InstallOutcome, InstallPromptController } from './install-prompt-controller'

export function useInstallPrompt(
  controller: InstallPromptController = browserInstallPromptController,
): { canInstall: boolean; prompt: () => Promise<InstallOutcome> } {
  const [canInstall, setCanInstall] = useState(() => controller.canInstall())

  useEffect(() => {
    setCanInstall(controller.canInstall())
    return controller.subscribe(setCanInstall)
  }, [controller])

  return { canInstall, prompt: () => controller.prompt() }
}
```

- [ ] **Step 4: Write `install-app-button.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { useInstallPrompt } from '#presentation/shared/use-install-prompt'
import type { InstallPromptController } from '#presentation/shared/install-prompt-controller'

function defaultIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

function defaultIsIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

/**
 * Hidden entirely once already installed. Otherwise: a real button on
 * Chromium (captures `beforeinstallprompt`), or static instructions on iOS
 * Safari — there's no install API there at all, so a button would have
 * nothing to trigger. `isStandalone`/`isIos` are injectable so tests don't
 * need to stub `window.matchMedia`/`navigator.userAgent` globally.
 */
export function InstallAppButton({
  controller,
  isStandalone = defaultIsStandalone,
  isIos = defaultIsIos,
}: {
  controller?: InstallPromptController
  isStandalone?: () => boolean
  isIos?: () => boolean
}) {
  const { canInstall, prompt } = useInstallPrompt(controller)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
  }, [isStandalone])

  if (installed) return null
  if (!canInstall && !isIos()) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install app</CardTitle>
        <CardDescription>
          Open arr like an app, without the browser's address bar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canInstall ? (
          <Button
            onClick={async () => {
              const outcome = await prompt()
              if (outcome === 'dismissed') toast.info('Install dismissed.')
            }}
          >
            <Download className="size-4" />
            Install app
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            On iPhone/iPad: tap Share, then "Add to Home Screen".
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test -- install-app-button
```

Expected: PASS (4 tests).

- [ ] **Step 6: Wire it into the Account route**

Modify `frontend/src/routes/account/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { requireOnboarded, requireSession } from '#presentation/shared/route-guards'
import { AppShell } from '#presentation/shared/app-shell'
import { InstallAppButton } from '#presentation/account/install-app-button'
import { LinkedAccountsPanel } from '#presentation/account/linked-accounts-panel'

export const Route = createFileRoute('/account/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    await requireOnboarded(connector)
    await requireSession(connector)
  },
  component: AccountRoute,
})

function AccountRoute() {
  return (
    <AppShell>
      <div className="space-y-6">
        <InstallAppButton />
        <LinkedAccountsPanel />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 7: Lint and typecheck**

```bash
cd frontend && pnpm run lint && pnpm run typecheck
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/presentation/shared/use-install-prompt.ts frontend/src/presentation/account/install-app-button.tsx frontend/src/routes/account/index.tsx frontend/tests/presentation/install-app-button.spec.tsx
git commit -m "feat(frontend): add InstallAppButton, wire into Account"
```

---

### Task 9: Update-available and offline-ready toasts — DROPPED

Dropped in the same amendment as Task 2's rewrite: `useRegisterSW` from
`virtual:pwa-register/react` has nothing to register — there is no service
worker (Task 2 finding). Do not implement this task. If offline caching is
revisited in a future spec (a hand-written SW-build plugin, per the
options presented to the user when this was decided), this task's original
toast-wiring design can be resurrected from git history.

---

### Task 10: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Format**

```bash
cd /home/floriaaan/dev/arr && task format
```

Expected: only whitespace/quote-style changes, if any, to files touched by this plan.

- [ ] **Step 2: Full check**

```bash
task check
```

Expected: PASS — lint, typecheck, `test:back` + `test:front`, `boundaries`, all green. This is exactly what CI runs.

- [ ] **Step 3: Production build**

```bash
task build
```

Expected: succeeds; re-confirm `dist/client/manifest.webmanifest` exists (same check as Task 2, now against the full production build). No `sw.js`/`workbox-*`/`offline.html` to check — Tasks 3 and 9 are dropped.

- [ ] **Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore(frontend): format" --allow-empty
```

(Use `--allow-empty` only if Step 1 produced no changes — otherwise drop the flag; don't commit an empty commit if there's nothing to say.)

- [ ] **Step 5: Note what's still manual**

Not verifiable in this environment (no browser available): a real Lighthouse PWA audit, and an actual "Add to Home Screen" test on an iOS device and an Android/Chrome device. **Specifically check on Chrome/Android whether `canInstall()` ever becomes `true`** — the final whole-branch review flagged that Chromium has historically gated `beforeinstallprompt` on a registered service worker with a fetch handler, which this build no longer has (see the plan header's amendment). If the install button never fires on a real Chrome/Android device, that's this concern confirmed, not a bug in `InstallAppButton` itself — the fix would be revisiting the service-worker decision, not the button's code. Surface this to the user as the last remaining step before calling the feature done — don't claim it works on a real device without having run it.

---

## Self-review notes

- **Spec coverage:** manifest/icons (Tasks 1–2, 6), offline banner (Tasks 4–6), install button + iOS hint (Tasks 7–8). No spec section without a task, for what remains in scope.
- **Type consistency checked:** `ConnectivityMonitor`/`InstallPromptController` signatures match exactly between their definition (Tasks 4/7), fakes (Tasks 4/7), hooks (Tasks 5/8), and components (Tasks 5/8) — `isOnline`/`subscribe`/`canInstall`/`prompt` used identically everywhere, no renamed variants.
- **No placeholders:** every step has real, complete code; Task 2's "verify against actual build output" step is a genuine check with a clear pass condition, not deferred work.

## Amendment (2026-08-22, mid-implementation)

The offline-app-shell half of the original plan (Tasks 3 and 9, and the
service-worker/workbox portion of Task 2) is dropped: `vite-plugin-pwa`
cannot generate a service worker under TanStack Start's build (confirmed
root cause: a shared mutable config object across Vite's Environment-API
client/ssr builds permanently defeats the plugin's own "am I building the
client?" guard; matches two independent open upstream issues,
`TanStack/router#4988` and `serwist/serwist#300`, both unresolved as of this
date). User decision, presented with three options (custom SW-build plugin,
patch `vite-plugin-pwa` directly, ship installable-only): **ship
installable-only**. Manifest, icons, install button, and the offline-status
banner (`OfflineBanner`/`ConnectivityMonitor`, which only ever needed
`navigator.onLine` and never depended on a service worker) are unaffected
and remain fully in scope. The spec document carries the same amendment.

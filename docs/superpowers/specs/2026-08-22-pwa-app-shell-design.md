# PWA support: installable + offline app-shell

Date: 2026-08-22
Scope: `frontend/` only. No backend changes.

> **Amendment, same day, mid-implementation:** the offline-app-shell half of
> this spec is dropped. Task 2's implementer found `vite-plugin-pwa` cannot
> generate a service worker under TanStack Start's build at all — it shares
> one mutable config object across Vite's Environment-API client/ssr builds,
> so its "am I building the client?" guard is permanently false and
> `_generateSW`/`sw.js` never runs. Confirmed empirically (`dist/client/`
> gets `manifest.webmanifest` + icons, never `sw.js` or any `workbox-*`
> chunk) and matches two independent open upstream issues
> (`TanStack/router#4988`, labeled `needs-upstream-fix`; `serwist/serwist#300`),
> unresolved as of this date. User decision: ship installable-only now
> (manifest, icons, install button, offline-status banner — none of which
> need a service worker) and defer offline caching to a future spec once
> upstream fixes this or a hand-written SW-build plugin is judged worth the
> investment. Every section below that assumed a working service worker
> (offline app-shell caching, the offline fallback page, update-available/
> offline-ready toasts) no longer applies — see the implementation plan's
> own amendment for the task-level breakdown.

## Goal

Make `arr` installable ("Add to Home Screen" on phones and desktop
Chrome/Edge, opening standalone without browser chrome) and resilient to a
dropped connection for anything already loaded, without ever risking stale
*data* — the product's core principle is that state shown to the user must
stay honest, and a service worker that silently serves a cached "Available"
badge would violate it worse than having no offline support at all.

## Non-goals (explicitly deferred, separate spec each)

- **Web Push notifications.** The existing notification system
  (`backend/src/application/notifications/notification-subscriber.ts`) is
  one shared admin-configured webhook URL, site-wide. Web Push is inherently
  per-user/per-device (subscription endpoint + keys per browser instance) —
  a different shape that needs its own subscription storage, VAPID key
  config, new backend endpoints, and a product decision on whether it's an
  admin-wide setting or a personal per-household-member toggle. Not designed
  here.
- **Background sync / offline mutation queueing.** Every action in this app
  (search, approve/reject/request, browse library) needs a live connection
  just to look anything up first — there's little a user could queue up
  fully offline. Dropped as YAGNI unless a concrete scenario shows up later.
- **Custom offline-capable data views** (e.g. browsing a fully cached
  library list with zero network). Only the app *shell* (JS/CSS/static
  assets, not `/api/*` responses) is cached.

## Architecture

Frontend-only; nothing touches `domain/`. Manifest, icons, and service
worker registration are pure config/browser-platform concerns — no business
rule involved, same precedent as `next-themes`'s `useTheme` used directly in
`presentation/` with no domain port. Two pieces get a small interface anyway
because they're genuinely swappable and worth testing without real browser
globals:

- **`ConnectivityMonitor`** (`presentation/shared/connectivity-monitor.ts`)
  — `{ isOnline(): boolean; subscribe(cb: (online: boolean) => void): () => void }`.
  `BrowserConnectivityMonitor` wraps `navigator.onLine` +
  `window.addEventListener('online'/'offline', …)`. `FakeConnectivityMonitor`
  is an in-memory, test-toggleable implementation — mirrors
  `FakeArrConnector`: lets `OfflineBanner` be unit-tested without touching
  real browser globals.
- **`InstallPromptController`** (`presentation/shared/install-prompt-controller.ts`)
  — `{ canInstall(): boolean; subscribe(cb: (canInstall: boolean) => void): () => void; prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> }`.
  `BrowserInstallPromptController` captures the Chromium-only
  `beforeinstallprompt` event; `canInstall()` is simply always `false`
  everywhere the event never fires (iOS Safari, Firefox, or once already
  running in standalone mode) — no user-agent sniffing needed for that part.

Everything else (manifest, icon files, SW registration/update) is
configuration plus one `registerSW()` call — nothing to abstract.

## Toolchain

- **`vite-plugin-pwa`** (registry-checked, `1.3.0` available) generates the
  web manifest and the service worker via Workbox's `generateSW` strategy,
  and ships `virtual:pwa-register/react`'s `useRegisterSW` hook for the
  update-prompt flow.
- **`@vite-pwa/assets-generator`** (registry-checked, `1.0.2` available)
  rasterizes `public/logo.svg` — the project's only existing icon asset,
  confirmed in PRODUCT.md as the sole brand asset on hand — into the full
  icon set: `pwa-192x192.png`, `pwa-512x512.png`, a maskable 512 variant
  (safe-zone padding for Android's adaptive-icon mask), `apple-touch-icon.png`
  (180×180), and favicons. Run once as a dev script
  (`pnpm run generate-pwa-assets`), output committed to `public/` like any
  other static asset — not part of `task build`, re-run manually if
  `logo.svg` ever changes.

Chosen over hand-rolling a service worker: Workbox is heavily battle-tested,
which matters specifically because a *buggy* hand-rolled cache (serving a
stale JS bundle forever after a deploy) is a worse failure mode here than no
offline support, given the product's honesty principle applies to the app
itself staying current, not just the data it shows.

### TanStack Start integration wrinkle

TanStack Start has no static `index.html` to transform — `<head>` is built
server-side in `src/routes/__root.tsx`'s `head()` function. `vite-plugin-pwa`'s
automatic HTML injection (`injectRegister: 'auto'`) doesn't apply here, so
integration is manual (a documented, supported pattern for SSR
meta-frameworks — same shape used for Remix/SvelteKit):

- `injectRegister: null` in the Vite plugin config.
- Manifest `<link rel="manifest">` added to `__root.tsx`'s existing
  `head: () => ({ links: [...], meta: [...] })`. The two `theme-color`
  metas (light value, plus a `media="(prefers-color-scheme: dark)"` variant
  for the browser-chrome color specifically — the manifest itself has no
  reliable dark-mode variant support yet) turned out **not** to work through
  that array: TanStack Router's `HeadContent` dedupes meta by `name`,
  collapsing both `theme-color` entries into one at render time. They ship
  instead as two literal `<meta>` JSX elements rendered directly in
  `RootDocument`'s `<head>`, alongside — not through — `head()`'s array,
  specifically to bypass that dedup.
- SW registration + update flow done from a small client-only hook
  (`use-service-worker-update.ts`) calling `useRegisterSW` directly, not
  through the manual-injection path.

### What "offline app-shell" actually means for an SSR app

Precaching *every* route's server-rendered HTML isn't how TanStack Start's
SSR works, so this isn't full offline browsing of arbitrary unvisited URLs.
Concretely:

- Workbox precaches the built JS/CSS bundle (same-origin static assets under
  `dist/client/assets`). Already-open tabs keep working fully client-side
  (client-side routing between pages whose JS chunk is already loaded) with
  no connection.
- `navigateFallback` points at a dedicated static `public/offline.html` (a
  plain static file, not a router route) — served only when a *fresh*
  navigation/reload happens with no network and no cached response for that
  URL. It states plainly that the connection is down and offers a retry, in
  keeping with "ambiguity is reported as ambiguity, never guessed away."
- `/api/*` is explicitly excluded from every caching strategy — network-only,
  always. This is the one non-negotiable rule in the whole spec.

## Components

### Manifest (`public/manifest.webmanifest`, generated by `vite-plugin-pwa`'s config)

`name: "arr"`, `short_name: "arr"`, `description` from PRODUCT.md's one-line
tagline, `start_url: "/"`, `scope: "/"`, `display: "standalone"`,
`theme_color`/`background_color` matching the light-mode `--background`
token, `orientation: "any"`, the generated icon set (including one
`purpose: "maskable"` entry).

### `OfflineBanner`

Rendered once, in `__root.tsx`'s `RootDocument`, sibling to `children` — one
integration point covers every page uniformly (`AppShell` pages *and*
login/setup, where knowing the connection is down is arguably more
important since sign-in obviously can't succeed). Reads
`ConnectivityMonitor`; shows a quiet top-of-viewport bar ("You're offline —
some data may be out of date") only while offline, auto-dismisses on
reconnect. No new visual system — reuses existing neutral/status tokens
(`bg-muted`/`text-muted-foreground`, `border-b`), consistent with
DESIGN.md's Status-Only-Color rule.

### `InstallAppButton`

Lives in `presentation/account` (per the confirmed "custom button" scope) as
a new row. Reads `InstallPromptController`:

- Hidden entirely once `window.matchMedia('(display-mode: standalone)').matches`
  (already installed) or when `canInstall()` is false with no iOS signal.
- On Chromium with `canInstall() === true`: a "Install app" button calling
  `prompt()`.
- On iOS Safari specifically (feature-detected via UA, the only viable
  signal here — there's no install API on iOS at all): static instructional
  text instead of a button — "On iPhone/iPad: use Share → Add to Home
  Screen" — shown only when not already installed.

### Update-available flow (`use-service-worker-update.ts`)

`registerType: 'prompt'` (not silent auto-activation — the user controls
when the new version takes over, consistent with the app never doing
anything silently behind the user's back). `useRegisterSW`'s `needRefresh`
flag surfaces a `sonner` toast — reusing the existing toast infra already
used throughout the app (`request-card.tsx`, `login-form.tsx`) rather than
building new UI — with a "Reload" action that calls `updateServiceWorker(true)`.
A single one-time "Ready to work offline" toast fires on first
`offlineReady`, quiet and non-repeating.

## Error handling

- SW registration is feature-detected (`'serviceWorker' in navigator`) and
  wrapped so an unsupported browser or a registration failure never breaks
  the app — it just runs without offline support, silently.
- The icon-generation script is a manual one-off, not part of `task build`;
  a missing/changed `logo.svg` at generation time fails loudly in that
  script's own run, never in the app build.
- `InstallPromptController.prompt()` resolves `'unavailable'` (never
  throws) when called with no captured event, so `InstallAppButton` doesn't
  need a try/catch.

## Testing

- Unit (Vitest): `OfflineBanner` driven by `FakeConnectivityMonitor` —
  shows/hides correctly on simulated online/offline transitions.
  `InstallAppButton` visibility logic against a fake
  `InstallPromptController` (hidden when already "installed", hidden when
  `canInstall()` false and not iOS, button vs. iOS-hint branching).
  A guard test parses `public/manifest.webmanifest` as valid JSON with the
  required fields present.
- Not testable in this environment: actual install banners, real
  service-worker caching behavior, and Lighthouse's PWA audit all need a
  real browser — this sandbox has none available (checked: no
  `chromium-cli`, no Chrome/Chromium binary, no Playwright in the project).
  Flagged here as manual verification needed post-merge: a real Lighthouse
  PWA audit, and an actual "Add to Home Screen" test on an iOS and an
  Android device.

## Risks / open questions carried into implementation

- Exact Workbox precache glob for TanStack Start's `dist/client` output
  needs to be verified against the real build output structure once
  implemented (file hashes, chunk naming) — not something to guess further
  at spec time.
- `theme-color` dark-mode meta support varies by browser; treat it as
  progressive enhancement, not a hard requirement.

---
name: arr
description: One search box, one request queue, one login for Radarr/Sonarr/Lidarr — a quiet, honest control panel.
colors:
  background: 'oklch(1 0 0)'
  foreground: 'oklch(0.141 0.005 285.823)'
  card: 'oklch(1 0 0)'
  card-foreground: 'oklch(0.141 0.005 285.823)'
  primary: 'oklch(0.21 0.006 285.885)'
  primary-foreground: 'oklch(0.985 0 0)'
  secondary: 'oklch(0.967 0.001 286.375)'
  secondary-foreground: 'oklch(0.21 0.006 285.885)'
  muted: 'oklch(0.967 0.001 286.375)'
  muted-foreground: 'oklch(0.552 0.016 285.938)'
  accent: 'oklch(0.967 0.001 286.375)'
  accent-foreground: 'oklch(0.21 0.006 285.885)'
  destructive: 'oklch(0.577 0.245 27.325)'
  border: 'oklch(0.92 0.004 286.32)'
  input: 'oklch(0.92 0.004 286.32)'
  ring: 'oklch(0.871 0.006 286.286)'
  status-success: '#059669'
  status-warning: '#d97706'
  chart-movie: 'oklch(0.646 0.222 41.116)'
  chart-series: 'oklch(0.6 0.118 184.704)'
  chart-album: 'oklch(0.398 0.07 227.392)'
  sidebar: 'oklch(0.985 0 0)'
  sidebar-foreground: 'oklch(0.141 0.005 285.823)'
  sidebar-accent: 'oklch(0.967 0.001 286.375)'
  sidebar-border: 'oklch(0.92 0.004 286.32)'
typography:
  display:
    fontFamily: 'Fraunces, Georgia, serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1
  body:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: '0px'
  md: '0px'
  lg: '0px'
  xl: '0px'
  full: '0px'
spacing:
  sidebar-width: '15rem'
  content-max: '64rem'
  page-padding: '1rem'
  page-padding-lg: '1.5rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-foreground}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  button-outline:
    backgroundColor: '{colors.background}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
  badge-default:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-foreground}'
    rounded: '{rounded.full}'
    padding: '2px 8px'
  badge-destructive:
    backgroundColor: '{colors.destructive}'
    textColor: '#ffffff'
    rounded: '{rounded.full}'
    padding: '2px 8px'
  card:
    backgroundColor: '{colors.card}'
    textColor: '{colors.card-foreground}'
    rounded: '{rounded.xl}'
---

# Design System: arr

## Overview

**Creative North Star: "The Honest Panel"**

Every visual choice serves one product promise: state you can trust at a glance. The system is a near-flat, near-neutral shadcn/ui foundation (Tailwind 4, 0-radius, `shadow-xs`/`shadow-sm` only) that stays out of the way for 95% of any screen — grayscale surfaces, thin 1px borders, Manrope for all reading text. The one place the UI is allowed to raise its voice is status: a request's badge, an instance's health, a stat card's tone. Color there is never decorative — `default` (dark neutral) means healthy/active, `destructive` red means failed or unreachable, `secondary` gray means in-progress, `outline` means not-yet-configured or awaiting. The Fraunces serif wordmark is the system's only ornament, reserved for the "arr" logotype and nothing else — a small warmth against an otherwise utilitarian, restrained-and-precise surface.

Three-way theming (light / dark / system, via `next-themes`) is a first-class constraint, not an afterthought: every token is defined once in `:root` and re-mapped in `.dark`, never hardcoded per-component. `body` itself carries no styling beyond font/color/background from those same tokens — `/login` and `/setup` render straight onto `<body>` with no wrapper, so they inherit the exact same neutral surface as the authenticated app shell.

**Corrected anti-reference (was wrong in an earlier pass):** `styles.css` used to carry a second, unrelated teal/green palette (`--sea-ink`/`--lagoon`/`--palm`/`--hero-*`/`--glow-*`/`--grid-*`) plus `.island-shell`, `.feature-card`, `.nav-link`, `.rise-in`, `.island-kicker`, `.site-footer` classes. The classes were genuinely dead (0 usages), but the custom properties were **not** — an unlayered `body { background: <gradient>; color: var(--sea-ink); }` rule and its `::before`/`::after` glow/grid overlays painted every screen that renders without an opaque wrapper, which in practice meant `/login` and `/setup` showed a teal gradient while the rest of the app (wrapped in `AppShell`'s `bg-background` div) did not. Confirmed with the user and removed entirely — see Do's and Don'ts.

**Key Characteristics:**

- Grayscale-first surface; color is reserved for status, never for brand decoration.
- Flat by default — `shadow-xs`/`shadow-sm` only, no layered elevation.
- Sharp, modern geometry — square corners everywhere, no rounding.
- One serif accent (Fraunces) on the wordmark; everything else is Manrope.
- `tap-scale` press feedback (scale 1.02 hover / 0.97 active) is the system's one shared micro-interaction, applied uniformly via a CSS utility rather than per-component `hover:scale-*`.
- Light/dark/system theming is structural, not optional.

## Colors

Near-neutral throughout; the only saturated hues are functional status colors.

### Primary

- **Primary Ink** (`oklch(0.21 0.006 285.885)` light / `oklch(0.985 0 0)` dark): default button fill, "Active" stat-card tone, primary badge, active-state text. Inverts fully between themes — dark-on-light in light mode, light-on-dark in dark mode.

### Neutral

- **Paper** (`oklch(1 0 0)` light / `oklch(0.141 0.005 285.823)` dark) — `background`/`card`/`popover`: page and surface base.
- **Ink** (`oklch(0.141 0.005 285.823)` light / `oklch(0.985 0 0)` dark) — `foreground`: primary text.
- **Quiet Gray** (`oklch(0.967 0.001 286.375)` light / `oklch(0.274 0.006 286.033)` dark) — `secondary`/`muted`/`accent`: subdued fills (icon chips, "in-progress" badges, hover states).
- **Muted Ink** (`oklch(0.552 0.016 285.938)` light / `oklch(0.705 0.015 286.067)` dark) — `muted-foreground`: captions, timestamps, secondary metadata.
- **Hairline** (`oklch(0.92 0.004 286.32)` light / `oklch(0.274 0.006 286.033)` dark) — `border`/`input`: the only stroke weight in the system, 1px.
- **Focus Ring** (`oklch(0.871 0.006 286.286)` light / `oklch(0.442 0.017 285.786)` dark) — `ring`: 3px focus-visible ring on every interactive element.

### Status (functional only — never decorative)

- **Failure Red** (`oklch(0.577 0.245 27.325)`, `destructive`): failed requests, unreachable instances, destructive actions, validation errors.
- **Available Green** (`#059669`, Tailwind `emerald-600`): "Available" stat tone and catalog "already in library" confirmation icon. Not a design token yet — applied via literal Tailwind utility, not a CSS custom property; treat as an established color even though it isn't wired into `:root`.
- **Attention Amber** (`#d97706`, Tailwind `amber-600`): non-blocking warnings (e.g. a profile field needing review before save).

### Chart (library composition only)

- **Movie** (`oklch(0.646 0.222 41.116)`), **Series** (`oklch(0.6 0.118 184.704)`), **Album** (`oklch(0.398 0.07 227.392)`) — the only place multi-hue color appears: the library size-breakdown bar, one hue per media kind. `chart-4`/`chart-5` exist in `:root` but are unused; don't introduce a fourth/fifth series without a real fourth media kind to back it.

### Named Rules

**The Status-Only Color Rule.** Outside of the library composition chart, saturated color exists to report state (success/failure/warning/active), never to decorate a surface. If a color isn't reporting something, it should be neutral.

## Typography

**Display Font:** Fraunces (variable, optical size + weight axes), with Georgia/serif fallback
**Body Font:** Manrope (400–800), with ui-sans-serif/system-ui fallback

**Character:** A restrained sans interface (Manrope) with exactly one serif accent (Fraunces) — the wordmark is the only place the system allows personality into typography; every other role reads as plain, legible UI text.

### Hierarchy

- **Display** (600, 1.125rem `text-xl`, line-height 1.2): the "arr" logotype in the sidebar/mobile header only. `.display-title` utility. Never used for page headings.
- **Title** (600 `font-semibold`, 1rem default, line-height 1): card titles, dialog titles, section headings.
- **Body** (400–500, 0.875rem `text-sm`, line-height 1.5): the default weight for nearly all interface copy — request titles, form labels' sibling text, descriptions.
- **Label** (500, 0.75rem `text-xs`, line-height 1.4): badges, timestamps, muted metadata ("Requested by … · date"), kbd hints.

### Named Rules

**The One-Serif Rule.** Fraunces appears exactly once per screen, on the "arr" wordmark. It never appears on page titles, buttons, or body copy — introducing it elsewhere would compete with the wordmark instead of marking it.

## Layout

Single persistent app shell: a fixed 240px (`w-60`) sidebar from `md` up, collapsing to a `Sheet` drawer below `md` (rendered twice rather than repositioned with CSS, so the drawer keeps its own focus trap and the desktop rail doesn't). Content area centers at `max-w-5xl` inside `p-4 md:p-6`. `h-dvh` is used instead of `h-screen` so mobile browser chrome doesn't clip the bottom of the layout. No marketing/landing surface exists — the root route redirects straight into `/requests`; every screen is inside the authenticated app shell.

Spacing otherwise follows Tailwind's default 4px-based scale with no custom overrides.

**Grid backdrop (login/setup only).** A fine 40px line grid at 8% foreground opacity, faded out via a `radial-gradient` mask centered slightly above middle, sits behind the two unauthenticated first-run screens (`.grid-backdrop` in `styles.css`, applied to `LoginForm`'s and `/setup`'s own wrapper `div`). It's the one piece of texture the system allows, and it's scoped per-container — `position: relative` + an absolutely-positioned `::before` — rather than painted on `body`, on purpose: a body-level background that only shows through where nothing happens to cover it is exactly the bug the old teal gradient caused (see Overview). Dense authenticated views (requests/library/settings) stay flat; this is a first-impression texture, not a site-wide one.

## Elevation & Depth

Flat by default. Cards use `shadow-sm`, inputs/outline buttons use `shadow-xs`; nothing beyond that exists in the live system. Depth is conveyed by border + subtle background-tone shift (card vs. muted vs. background), not by shadow stacking.

### Named Rules

**The Flat-By-Default Rule.** No component escalates past `shadow-sm`. If a screen needs more visual separation, reach for a border or a muted-background block before reaching for a bigger shadow.

## Shapes

Every surface is square: buttons, inputs, cards, icon tiles, and badges all sit at 0-radius. No pill shapes, no soft corners — status badges become rectangular tags instead of chips, distinguished by fill/border alone, not silhouette. Borders stay hairline (1px); the only softness left in the system is the Fraunces wordmark and the flat shadow, never the geometry.

### Named Rules

**The Square Corner Rule.** No component earns a radius. If a shape needs to read as "special" (a status tag, a floating panel), separate it with color, weight, or a border — never with a rounded corner.

## Components

### Buttons

- **Shape:** square, 0-radius, height 36px default (`h-9`), 32/40px for `sm`/`lg`, square for icon variants.
- **Primary:** `bg-primary`/`text-primary-foreground`, `px-4 py-2`, `hover:bg-primary/90`.
- **Outline:** transparent-on-background with 1px border, `shadow-xs`, `hover:bg-accent`.
- **Secondary / Ghost / Link / Destructive:** secondary is a filled quiet-gray variant; ghost has no fill until hover; link renders as underlined primary-colored text; destructive uses the Failure Red role.
- **Interaction:** every button is `tap-scale` — 180ms color/border transitions plus a distinct 160ms press curve (`scale(1.02)` hover, `scale(0.97)` active), disabled under `prefers-reduced-motion`.

### Badges (status tag)

- **Style:** square, 0-radius (a rectangular tag, not a pill), `text-xs font-medium`, `px-2 py-0.5`, no default border.
- **Variants map to meaning, not decoration:** `default` (filled primary) = healthy/enabled/linked; `secondary` (quiet gray) = in-progress/disabled-on-purpose/hidden; `destructive` (red) = failed/unreachable; `outline` = not-yet-configured/awaiting approval.

### Cards / Containers

- **Corner Style:** square, 0-radius.
- **Background:** `bg-card` on `bg-background`, near-imperceptible in light mode, a real tonal step in dark mode.
- **Shadow Strategy:** `shadow-sm` only (see Elevation & Depth).
- **Border:** none by default; individual sections add a 1px `border` when grouping multiple cards.
- **Internal Padding:** `py-6`/`px-6` via `CardHeader`/`CardContent`/`CardFooter` sub-components.

### Inputs / Fields

- **Style:** 1px `border-input`, `bg-transparent` (dark mode: `bg-input/30`), square (0-radius), `shadow-xs`, height 36px.
- **Focus:** border shifts to `ring` color plus a 3px `ring-ring/50` halo — no glow, no color change beyond the ring.
- **Error / Disabled:** `aria-invalid` swaps border/ring to the destructive role at reduced opacity; disabled drops to 50% opacity and blocks pointer events.

### Navigation (sidebar)

- **Style:** flat text links, square (0-radius), `px-3 py-2`, `text-sm font-medium`. Active/hover state fills with `bg-sidebar-accent`; inactive items sit at 70% foreground opacity. No underline, no icon-only collapse — icon + label always paired.
- **Mobile:** identical sidebar content rendered inside a `Sheet` drawer triggered from a `md:hidden` top header bar.

### Instance Status Badge (signature component)

The visual expression of the product's core honesty principle: an instance's badge distinguishes four states, never collapsing "off on purpose" into "broken." `Not configured` (`outline`) → `Disabled` (`secondary`) → `Unreachable` (`destructive`, with a "checked \<time\>" caption) → `Enabled` (`default`). Any new instance-facing surface must reuse this exact state set and variant mapping rather than inventing a parallel health indicator.

### Stat Cards (requests overview)

Four small metric cards (Total / Active / Available / Failed) pairing an icon with a colored count: `text-foreground` for Total, `text-primary` for Active, `text-emerald-600` for Available, `text-destructive` for Failed. The tone is the only differentiator; layout, size, and weight are identical across all four.

## Do's and Don'ts

### Do:

- **Do** treat color as a status signal first — pick a badge/text variant by what it reports (healthy/in-progress/failed/unconfigured), not by visual preference.
- **Do** reuse the Instance Status Badge's exact four-state mapping for any new reachability/health surface.
- **Do** keep Fraunces confined to the "arr" wordmark; every other heading and body role is Manrope.
- **Do** define new tokens in both `:root` and `.dark` at once — no component should hardcode a light-only or dark-only value.
- **Do** apply `tap-scale` to new interactive elements instead of a bespoke `hover:scale-*`.
- **Do** keep the `.grid-backdrop` line-grid texture confined to login/setup; it's a first-impression signature, not a site-wide pattern.

### Don't:

- **Don't** reintroduce a `--sea-ink`/`--lagoon`/`--palm`/`--hero-*`/`--glow-*`/`--grid-*`-style decorative body background or an unlayered `body {}` rule that paints ahead of `@layer base`. It painted `/login` and `/setup` teal until this pass removed it; any new top-level page must render inside (or reproduce) `bg-background`/`text-foreground`, not rely on `body`'s own styling being neutral by accident.
- **Don't** introduce any border-radius above 0 — no `rounded-sm`/`md`/`lg`/`xl`/`full` on any component. `--radius-sm/md/lg/xl` are hardcoded to `0px` in `styles.css`, not derived from a `--radius` base, specifically so nothing can drift back to rounded through a calc() offset.
- **Don't** introduce a shadow past `shadow-sm`.
- **Don't** add a fourth or fifth library-composition chart color (`chart-4`/`chart-5` exist in `:root` but back no real media kind today).
- **Don't** hardcode a status color as a literal Tailwind class on a one-off element when an existing `Badge`/stat-tone convention already covers that meaning.

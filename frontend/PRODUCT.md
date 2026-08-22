# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two roles on one shared household deployment:

- **Admin** — self-hoster who deploys `arr`, connects Radarr/Sonarr/Lidarr
  instances during onboarding (network discovery, connection tests, quality
  profiles, root folders), manages download clients/indexers, and reviews
  instance health.
- **User** — household/family members who log in (email/password or OIDC SSO)
  to search the shared catalog, request media, and track it moving from
  "requested" to "in library" on the calendar/library views — without ever
  touching Radarr/Sonarr/Lidarr directly.

## Product Purpose

Replace three separate Radarr/Sonarr/Lidarr tabs, logins, and states with one
interface: one search box, one request queue, one login for the whole
household. Success is a request that visibly and reliably moves from
"submitted" to "in your library" without anyone checking the underlying \*arr
apps to find out what happened.

## Positioning

A unification layer, not a replacement for Radarr/Sonarr/Lidarr: it sits in
front of instances the user already runs and adds what none of them offer
alone — one login surface across all three, a background reconciler that
keeps request state honest instead of stuck on "submitted", and instance
health that distinguishes "unreachable" from "an admin turned it off on
purpose." A neighboring product covering only one of Radarr/Sonarr/Lidarr
cannot truthfully claim this.

## Operating Context

Self-hosted, typically via Docker Compose alongside the user's existing
Radarr/Sonarr/Lidarr containers (nginx routes `/api/*` to backend, everything
else to frontend). First boot redirects to `/setup` for admin account creation
and instance connection. Two background services run alongside the HTTP
server: `requests:reconcile` (advances request state by polling \*arr
instances) and `instances:health` (periodic reachability checks). Frontend can
also run standalone against an in-memory fake connector for UI work with no
backend or database (`task dev:fake`).

## Capabilities and Constraints

- Surfaces observed in the frontend: catalog (search/request), requests
  (queue/tracking), library, calendar, onboarding/setup, settings
  (instance profiles, download clients, indexers), account/identity, login.
- Auth via better-auth: email/password and/or OIDC SSO (PocketID and
  compatible providers), admin/user roles built in.
- Recently adapted for small screens (mobile) — responsive web, not a native
  app; platform is `web` throughout, no separate mobile design language.
- An instance's \*arr API key is never returned in clear text by the API
  (DTOs expose `hasApiKey: boolean` only) and never transits as a query
  string — durable constraint on any UI that surfaces or edits it.
- Instance health must keep "unreachable" and "admin-disabled" visibly
  distinct in the UI; collapsing them back into one state is a regression.

## Evidence on Hand

- `frontend/public/logo.svg` — existing product logo, used at 96×96 in the
  project README.
- No testimonials, case studies, benchmarks, or pricing exist; this is a
  self-hosted open-source tool (MIT-licensed) with no commercial claims to
  make or preserve.

## Product Principles

1. One surface, three backends — never let the seams between
   Radarr/Sonarr/Lidarr show through to the user.
2. State must stay honest — a request or instance status shown to the user
   should always match reality, not a stale assumption; ambiguity (e.g.
   unreachable vs. disabled) is reported as ambiguity, never guessed away.
3. Admin configuration lives entirely in the UI — no config files, no
   dropping to a shell, even for network discovery and quality profiles.
4. Household-shared, not power-user-only — a user role only ever searches,
   requests, and tracks; it is never expected to understand the underlying
   \*arr apps.
5. Self-hosted trust — secrets (API keys, auth) are handled with the
   conservatism of software the user runs on their own infrastructure.

## Accessibility & Inclusion

General WCAG 2.1 AA target across the frontend.

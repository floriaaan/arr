<p align="center">
  <img src="./frontend/public/logo.svg" alt="arr logo" width="96" height="96" />
</p>

<h1 align="center">arr</h1>

<p align="center">One search box, one request queue, one login — for Radarr, Sonarr and Lidarr.</p>

<p align="center">
  <a href="https://github.com/floriaaan/arr/actions/workflows/ci.yml"><img src="https://github.com/floriaaan/arr/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/floriaaan/arr/actions/workflows/codeql.yml"><img src="https://github.com/floriaaan/arr/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://github.com/floriaaan/arr/actions/workflows/docker.yml"><img src="https://github.com/floriaaan/arr/actions/workflows/docker.yml/badge.svg" alt="Docker" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
</p>

Running Radarr, Sonarr and Lidarr side by side means three tabs, three logins,
and three places to check before you know whether anything actually happened.
`arr` puts a single interface in front of all three: search once, request in
one click, and watch it move from "requested" to "in your library" without
touching any of the underlying apps.

- **One catalog, one queue** — search and request across every connected
  service from the same screen.
- **Requests that actually move** — a background reconciler keeps polling
  your \*arr instances, so a request never sits stuck on "submitted" while the
  download is long done.
- **Library and calendar** — what's already available, what's airing or
  releasing next, in one place.
- **Guided onboarding** — network discovery, connection tests, quality
  profiles and root folders, all configured from the UI, no config files.
- **Built-in auth** — email/password and/or OIDC SSO (PocketID and
  compatible providers), with admin/user roles out of the box.
- **Honest instance health** — an unreachable instance is reported as
  unreachable, never silently confused with one an admin turned off on
  purpose.

## Stack

| Layer          | Technology                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Backend        | [AdonisJS 7](https://adonisjs.com) (Node ≥ 24), Lucid ORM, VineJS                                      |
| Frontend       | [TanStack Start](https://tanstack.com/start) + React 19, TanStack Router/Query, Tailwind 4, shadcn/ui  |
| Database       | PostgreSQL 16                                                                                           |
| Auth           | [better-auth](https://better-auth.com) (email/password + generic OIDC)                                 |
| Monorepo       | pnpm workspaces, [Task](https://taskfile.dev) as the command runner                                    |
| Quality        | ESLint, Prettier, strict TypeScript, Japa (backend), Vitest (frontend), dependency-cruiser              |

## Quick start

Requirements: **Node ≥ 24**, **pnpm 11**, **Docker** (for Postgres) and
[**Task**](https://taskfile.dev/installation/).

```bash
git clone https://github.com/floriaaan/arr.git
cd arr

task setup   # installs dependencies, creates .env files from .env.example, builds once
```

Set `APP_KEY` in `.env` and `backend/.env` (a random 32-character string,
e.g. `openssl rand -base64 32`), then:

```bash
task dev     # Postgres in a container + backend, frontend and reconciler locally
```

The frontend listens on <http://localhost:3000>, the backend on
<http://localhost:3333>. On first boot the UI redirects to `/setup` to create
the admin account and connect your instances.

### Without a backend

The frontend can run entirely offline against an in-memory fake connector —
handy for UI work without a database or any \*arr instance:

```bash
task dev:fake
```

### Full stack, locally, via Docker

```bash
cp .env.example .env   # set APP_KEY and BETTER_AUTH_SECRET
task up                # builds + starts db, migrate, backend, frontend, reconciler, health, nginx
task logs
task down
```

Only `nginx` is exposed on the host (port 80 by default, `NGINX_PORT` to
change it): it routes `/api/*` to the backend and everything else to the
frontend, per `.docker/nginx/nginx.conf`. A one-off `migrate` service applies
pending migrations before backend/reconciler/watchlist-sync/health start.

## Deploying — drop-in docker-compose

Prebuilt images are published to GHCR on every push to `main` and on tags.
Copy this into your stack — right next to your existing Radarr/Sonarr/Lidarr
services — set a couple of env vars, and go:

```yaml
# docker-compose.yml
networks:
  arr-internal:

volumes:
  arr-pgdata:

services:
  arr-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: arr
      POSTGRES_PASSWORD: ${ARR_DB_PASSWORD:?set a real password}
      POSTGRES_DB: arr
    volumes:
      - arr-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U arr -d arr']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - arr-internal

  # One-off: applies pending migrations before arr-backend/arr-reconciler/
  # arr-watchlist-sync/arr-health start. Nothing else in this stack runs
  # migrations — skip it and every table is missing on first boot.
  arr-migrate:
    image: ghcr.io/floriaaan/arr-backend:latest
    command: ['node', 'bin/console.js', 'migration:run', '--force']
    restart: 'no'
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3333
      LOG_LEVEL: info
      APP_KEY: ${ARR_APP_KEY:?generate one with `openssl rand -base64 32`}
      APP_URL: https://arr.example.com
      BETTER_AUTH_SECRET: ${ARR_BETTER_AUTH_SECRET:?generate one with `openssl rand -base64 32`}
      DB_HOST: arr-db
      DB_PORT: 5432
      DB_USER: arr
      DB_PASSWORD: ${ARR_DB_PASSWORD:?set a real password}
      DB_DATABASE: arr
    depends_on:
      arr-db:
        condition: service_healthy
    networks:
      - arr-internal

  arr-backend: &arr-backend
    image: ghcr.io/floriaaan/arr-backend:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3333
      LOG_LEVEL: info
      APP_KEY: ${ARR_APP_KEY:?generate one with `openssl rand -base64 32`}
      APP_URL: https://arr.example.com
      BETTER_AUTH_SECRET: ${ARR_BETTER_AUTH_SECRET:?generate one with `openssl rand -base64 32`}
      DB_HOST: arr-db
      DB_PORT: 5432
      DB_USER: arr
      DB_PASSWORD: ${ARR_DB_PASSWORD:?set a real password}
      DB_DATABASE: arr
      # Optional SSO (leave unset to configure it from the onboarding UI instead)
      OIDC_ISSUER_URL: ${ARR_OIDC_ISSUER_URL:-}
      OIDC_CLIENT_ID: ${ARR_OIDC_CLIENT_ID:-}
      OIDC_CLIENT_SECRET: ${ARR_OIDC_CLIENT_SECRET:-}
      DISABLE_PASSWORD_LOGIN: 'false'
      # Optional: pre-create these *arr instances at boot (leave unset to add
      # them from the onboarding UI instead). Never overwrites an instance
      # already saved from the UI. The admin account still has to be created
      # through the UI regardless — cf. docs/adr/0010.
      SONARR_URL: ${ARR_SONARR_URL:-}
      SONARR_API_KEY: ${ARR_SONARR_API_KEY:-}
      RADARR_URL: ${ARR_RADARR_URL:-}
      RADARR_API_KEY: ${ARR_RADARR_API_KEY:-}
      LIDARR_URL: ${ARR_LIDARR_URL:-}
      LIDARR_API_KEY: ${ARR_LIDARR_API_KEY:-}
    depends_on:
      arr-db:
        condition: service_healthy
      arr-migrate:
        condition: service_completed_successfully
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://127.0.0.1:3333/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 5
    # Not published to the host — only arr-nginx needs to be. It routes
    # /api/* to this service over the internal network.
    networks:
      - arr-internal

  # Same image, three long-running commands instead of the HTTP server:
  # nothing else advances request/instance state outside these processes.
  arr-reconciler:
    <<: *arr-backend
    command: ['node', 'bin/console.js', 'requests:reconcile']
    healthcheck: { disable: true }

  arr-watchlist-sync:
    <<: *arr-backend
    command: ['node', 'bin/console.js', 'watchlist:sync']
    healthcheck: { disable: true }

  arr-health:
    <<: *arr-backend
    command: ['node', 'bin/console.js', 'instances:health']
    healthcheck: { disable: true }

  arr-frontend:
    image: ghcr.io/floriaaan/arr-frontend:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      BACKEND_URL: http://arr-backend:3333
    depends_on:
      arr-backend:
        condition: service_healthy
    # Not published to the host — only arr-nginx needs to be, cf. below.
    networks:
      - arr-internal

  # Single host entrypoint: /api/* to arr-backend, everything else to
  # arr-frontend — the built frontend image only proxies /api in `vite dev`,
  # not in production, hence the 404s on every /api/* call without this.
  arr-nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - '80:80' # or drop this and put it behind your reverse proxy instead
    depends_on:
      arr-backend:
        condition: service_healthy
      arr-frontend:
        condition: service_healthy
    networks:
      - arr-internal
```

Save this next to `docker-compose.yml` as `nginx.conf` — same file as this
repo's [`.docker/nginx/nginx.conf`](./.docker/nginx/nginx.conf):

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://arr-backend:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://arr-frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ARR_APP_KEY=$(openssl rand -base64 32) ARR_BETTER_AUTH_SECRET=$(openssl rand -base64 32) ARR_DB_PASSWORD=change-me docker compose up -d
```

Put `arr-nginx` behind whatever reverse proxy already fronts the rest of
your stack (Traefik, Caddy, nginx…) and point it at `APP_URL`, or drop its
`ports:` mapping and let that existing reverse proxy publish port 80/443
directly.

## Configuration

Two environment files, two different jobs:

- **`.env` (root)** — consumed by Docker Compose: Postgres provisioning,
  published ports, secrets shared across containers.
- **`backend/.env`** — consumed by the backend in local development.

Key variables:

| Variable                                                          | Default                                      | Role                                                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                                                         | —                                             | **Required.** AdonisJS encryption key (sessions, cookies, stored API keys).                                                 |
| `BETTER_AUTH_SECRET`                                              | —                                             | **Required.** better-auth session/cookie signing key.                                                                       |
| `APP_URL`                                                         | `http://localhost:3333`                       | Public URL of the backend.                                                                                                  |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_DATABASE` | `localhost` / `5432` / `arr` / `arr` / `arr`  | PostgreSQL connection.                                                                                                      |
| `CORS_ORIGIN`                                                     | `http://localhost:3000`                       | Frontend origin — also better-auth's `trustedOrigins`, required for SSO.                                                    |
| `LOG_LEVEL`                                                       | `info`                                        | Pino log level.                                                                                                             |
| `OIDC_ISSUER_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET`       | empty                                         | SSO OIDC. Optional: configurable from the onboarding UI instead. When set, these env vars **take precedence** over the DB config. |
| `DISABLE_PASSWORD_LOGIN`                                          | `false`                                       | Forces SSO as the only sign-in method.                                                                                      |
| `SONARR_URL` / `SONARR_API_KEY`, `RADARR_URL` / `RADARR_API_KEY`, `LIDARR_URL` / `LIDARR_API_KEY` | empty | Optional: pre-create that instance at boot instead of adding it from the onboarding UI. Skipped if an instance of that kind already exists — never overwrites one saved from the UI. Doesn't skip the admin-account onboarding step. |
| `VITE_CONNECTOR`                                                  | `http`                                        | `http` = real backend, `fake` = offline fake connector.                                                                     |
| `NGINX_PORT`                                                      | `80`                                          | Host port published by the `nginx` service — the only container exposed.                                                   |

## Commands

Everything goes through [Task](https://taskfile.dev) — `task --list` for the
full list.

| Command                                                                  | Effect                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `task setup`                                                              | Install + `.env` + initial build                              |
| `task dev`                                                                | Full dev stack (containerized db, local processes)            |
| `task dev:fake`                                                           | Frontend only, against the fake connector                     |
| `task dev:db`                                                             | Postgres only                                                  |
| `task check`                                                              | **The CI command**: lint + typecheck + tests + boundary lint   |
| `task lint` / `task format` / `task typecheck`                            | Across both packages                                           |
| `task test` / `task test:back` / `task test:front`                        | Test suites                                                    |
| `task boundaries`                                                         | Enforces the layer dependency rule                              |
| `task build`                                                              | Builds both packages                                            |
| `task db:migrate` / `task db:rollback` / `task db:seed` / `task db:reset` | Migrations and seeds                                            |
| `task up` / `task down` / `task logs`                                     | Production-like Docker stack                                    |

## Architecture

Both packages follow the **same layered architecture**, with a one-way
dependency rule enforced automatically by `dependency-cruiser`:

```
presentation ─┐
              ├─→ application ─→ domain
infrastructure┘
```

- **`domain/`** — entities, aggregates, value objects, events and port
  _interfaces_. Zero dependencies: no framework, no HTTP client, no Zod.
- **`application/`** — use cases, orchestration. Depends only on the domain.
- **`infrastructure/`** — port implementations: Lucid repositories, the
  `servarr` ACL, the better-auth adapter, image caching.
- **`presentation/`** — HTTP controllers and routes on the backend, React
  components and routes on the frontend.

Ports are wired to their implementations in `providers/`, outside `src/` —
`presentation` never imports `infrastructure` directly.

```
arr/
├── backend/                 # AdonisJS 7
│   ├── app/ start/ config/  # framework glue (snake_case)
│   ├── commands/            # Ace commands: requests:reconcile, instances:health
│   ├── database/            # migrations, schema
│   ├── providers/           # port wiring
│   ├── src/                 # domain / application / infrastructure / presentation
│   └── tests/               # mirrors src/, plus functional tests
├── frontend/                # TanStack Start + React 19
│   ├── providers/           # connector selection (http | fake)
│   ├── src/                 # the same four layers
│   └── tests/                # domain, presentation, connector contract
└── docs/                    # phase-by-phase functional specs
```

### Long-running processes

Beyond the HTTP server, two Ace commands run as dedicated services
(`reconciler` and `health` in `compose.yml`):

- **`requests:reconcile`** — polls the \*arr instances and advances request
  state. Without it, progress never moves past "submitted".
- **`instances:health`** — periodically re-checks instance reachability, to
  tell "disabled" apart from "unreachable".

In local development, `task dev` starts the reconciler; run health checks
on demand with `node ace instances:health` from `backend/`.

### The frontend connector

Components never talk to the backend directly — everything goes through the
`ArrConnector` interface, with two implementations: `HttpArrConnector` (the
real backend) and `FakeArrConnector` (in-memory data). Selection happens via
`VITE_CONNECTOR`, and a contract test suite guarantees both behave
identically.

## Tests

```bash
task test           # backend (Japa) + frontend (Vitest)
task test:back
task test:front
task test:contract  # ArrConnector contract suite (Http vs Fake)
```

Backend tests need a reachable PostgreSQL database (`task dev:db` is
enough); its config lives in `backend/.env.test`.

## Continuous integration

| Workflow                                       | Trigger                            | Job                                                          |
| ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| [`ci.yml`](./.github/workflows/ci.yml)         | push to `main`, pull requests       | `task check` (lint, typecheck, tests, boundaries), then `task build` |
| [`docker.yml`](./.github/workflows/docker.yml) | push to `main`, tags `v*.*.*`        | Builds and publishes backend/frontend images to GHCR              |
| [`codeql.yml`](./.github/workflows/codeql.yml) | push to `main`, pull requests, weekly | Static security analysis                                         |

Published images are ready to pull:

```bash
docker pull ghcr.io/floriaaan/arr-backend:latest
docker pull ghcr.io/floriaaan/arr-frontend:latest
```

## Contributing

Before opening a pull request:

```bash
task format
task check
```

[`CLAUDE.md`](./CLAUDE.md) documents the repository's conventions for coding
agents — it doubles as a solid onboarding read for human contributors too.

## License

[MIT](./LICENSE)

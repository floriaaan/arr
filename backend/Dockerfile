# Built with the monorepo root as build context (needs pnpm-workspace.yaml
# and the lockfile) — see compose.yml: build.context: . / dockerfile: backend/Dockerfile
#
# Copies the full workspace node_modules into the final image rather than
# pruning to production-only deps via `pnpm deploy` — good enough for the
# Phase 1 skeleton, revisit in the Phase 6 performance pass.

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --filter arr-backend...

FROM deps AS build
COPY backend ./backend
RUN pnpm --filter arr-backend run build

FROM base AS production
ENV NODE_ENV=production
RUN addgroup -S arr && adduser -S arr -G arr
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/build ./backend/build
COPY --from=build /app/backend/package.json ./backend/package.json
RUN chown -R arr:arr /app
USER arr
WORKDIR /app/backend/build
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3333/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "bin/server.js"]

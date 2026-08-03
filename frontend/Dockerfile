# Built with the monorepo root as build context — see compose.yml:
# build.context: . / dockerfile: frontend/Dockerfile
#
# `vite build` (no --deployment target selected at scaffold time) emits a
# plain `{ fetch(request) }` handler at dist/server/server.js rather than a
# standalone server, so server.mjs is a small Node http <-> Fetch bridge that
# actually boots it. Revisit if/when the `nitro` add-on is applied instead
# (cf. server.mjs comment) — that would give a ready-made Node entrypoint.

FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --filter arr-frontend...

FROM deps AS build
COPY frontend ./frontend
RUN pnpm --filter arr-frontend run build

FROM base AS production
ENV NODE_ENV=production
RUN addgroup -S arr && adduser -S arr -G arr
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/frontend/node_modules ./frontend/node_modules
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/frontend/server.mjs ./frontend/server.mjs
COPY --from=build /app/frontend/package.json ./frontend/package.json
RUN chown -R arr:arr /app
USER arr
WORKDIR /app/frontend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]

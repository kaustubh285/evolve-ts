# Evolve — one container: Tailscale (tailnet-only access) + the TanStack Start server.
# Built by Render's Docker runtime straight from the repo. linux/amd64.
# No secrets here: everything comes from Render env vars at runtime.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build
# Bun only for installing (bun.lock); the build itself runs on Node like production.
COPY --from=oven/bun:1.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN node ./node_modules/vite/bin/vite.js build \
  # migrate.mjs with drizzle-orm + pg bundled in (the server output has no node_modules)
  && bun build scripts/migrate.ts --target=node --outfile=dist/migrate.mjs

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim
# tailscaled needs CA certs to talk to the coordination server.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Static Go binaries — fine on Debian slim.
COPY --from=tailscale/tailscale:stable /usr/local/bin/tailscale /usr/local/bin/tailscaled /usr/local/bin/

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/dist/migrate.mjs ./migrate.mjs
COPY --from=build /app/src/db/migrations ./migrations
COPY --from=build /app/scripts/start.sh ./start.sh

# Tailscale state: Render's persistent disk is mounted at /var/lib/tailscale (set in Render).
CMD ["/app/start.sh"]

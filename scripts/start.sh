#!/bin/sh
# Container entrypoint: join the tailnet, expose the app over it, migrate, start.
set -e

if [ "$SKIP_TAILSCALE" = "1" ]; then
  # Local `docker run` testing only: no tailnet, listen on all container interfaces
  # so `-p 127.0.0.1:3000:3000` can reach it. Never set this on Render.
  echo "[start] SKIP_TAILSCALE=1 — no tailnet (local testing)"
  APP_HOST=0.0.0.0
else
  # Render can't create a TUN device → userspace networking.
  # State on the persistent disk → same tailnet device (and name) across deploys.
  mkdir -p /var/lib/tailscale
  tailscaled --tun=userspace-networking --statedir=/var/lib/tailscale \
    --socket=/tmp/tailscaled.sock &
  # The auth key is only needed for the first login; afterwards the saved state is enough.
  tailscale --socket=/tmp/tailscaled.sock up \
    --auth-key="${TS_AUTHKEY:?TS_AUTHKEY is not set}" --hostname="${TS_HOSTNAME:-evolve}"
  # HTTPS with a real ts.net cert → the app on localhost. Re-applied each start (idempotent).
  tailscale --socket=/tmp/tailscaled.sock serve --bg --https=443 http://127.0.0.1:3000
  # Only tailscale serve (same container) talks to the app.
  APP_HOST=127.0.0.1
fi

# Fail the deploy (instead of serving errors) if the DB is unreachable or a migration breaks.
MIGRATIONS_DIR=/app/migrations node /app/migrate.mjs

echo "[start] app on ${APP_HOST}:3000"
HOST="$APP_HOST" PORT=3000 exec node /app/.output/server/index.mjs

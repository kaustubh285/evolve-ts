#!/bin/sh
# Container entrypoint: join the tailnet, expose the app over it, migrate, start, self-check.
set -e

# The app listens on all container interfaces. On Railway that's the platform's normal
# pattern (a loopback-only socket was never reached there). It stays tailnet-only because
# the service has NO Railway domain and NO TCP proxy: the only way in is tailscale serve.
APP_PORT=3000

if [ "$SKIP_TAILSCALE" = "1" ]; then
  # Local `docker run` testing only (no tailnet). Never set this on Railway.
  echo "[start] SKIP_TAILSCALE=1 — no tailnet (local testing)"
else
  mkdir -p /var/lib/tailscale
  # Railway blocks UDP (netcheck: "UDP is blocked") and the direct path dropped large
  # packets, which broke TLS. Always go through Tailscale's DERP relays (TCP) instead.
  export TS_DEBUG_ALWAYS_USE_DERP=true
  # No TUN device in the container → userspace networking. State on the volume →
  # same tailnet device and name across deploys. tailscaled is very chatty: keep its
  # logs in a file (last run only) instead of flooding the shared output with the app.
  tailscaled --tun=userspace-networking --statedir=/var/lib/tailscale \
    --socket=/tmp/tailscaled.sock >/tmp/tailscaled.log 2>&1 &
  tailscale --socket=/tmp/tailscaled.sock up \
    --auth-key="${TS_AUTHKEY:?TS_AUTHKEY is not set}" --hostname="${TS_HOSTNAME:-evolve}"
  # HTTPS with a real ts.net cert → the app. Re-applied each start (idempotent).
  tailscale --socket=/tmp/tailscaled.sock serve --bg --https=443 "http://127.0.0.1:${APP_PORT}"
fi

# Fail the deploy (instead of serving errors) if the DB is unreachable or a migration breaks.
MIGRATIONS_DIR=/app/migrations node /app/migrate.mjs

echo "[start] app on 0.0.0.0:${APP_PORT}"
HOST=0.0.0.0 PORT="$APP_PORT" node /app/.output/server/index.mjs &
APP_PID=$!

# Forward stop signals to the app (this shell is PID 1 now, not node).
trap 'kill -TERM "$APP_PID" 2>/dev/null' TERM INT

# Self-check: ask the app for a page over loopback and log ONE clear line, so a broken
# deploy is obvious in the Railway logs without SSH-ing in.
node -e '
const url = "http://127.0.0.1:" + process.argv[1] + "/api/auth/ok";
const deadline = Date.now() + 60000;
(async () => {
  let last = "";
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log("[selfcheck] OK — app answered", r.status, "on", url);
      return;
    } catch (e) {
      last = e.name + ": " + e.message + " | cause: " + (e.cause?.code ?? "") + " " + (e.cause?.message ?? "");
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  console.log("[selfcheck] FAIL — no answer from", url, "within 60s. Last error:", last);
})();
' "$APP_PORT" || true

# Keep the container alive as long as the app runs; exit with its status.
wait "$APP_PID"

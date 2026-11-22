#!/bin/sh
# Run the production image locally, reachable ONLY over the tailnet — a dress rehearsal for Render.
#
#   scripts/test-tailnet-local.sh          build + start  → https://<TS_HOSTNAME>.<tailnet>.ts.net
#   scripts/test-tailnet-local.sh restart  restart the app container (same tailnet device expected)
#   scripts/test-tailnet-local.sh logs     follow the app logs
#   scripts/test-tailnet-local.sh down     remove containers, network, volumes
#
# Uses TS_AUTHKEY and ALLOWED_EMAILS from .env.local (never printed).
# Tailnet name: TS_HOSTNAME from the shell, else from .env.local, else `evolve-test`.
# `evolve` is refused — that name belongs to the Render deploy.
# The database is a throwaway Postgres — nothing touches your dev databases.
# No ports are published: the tailnet is the only way in.
set -e
cd "$(dirname "$0")/.."

NET=evolve-tailnet-test
DB=evolve-tailnet-test-db
APP=evolve-tailnet-test
TS_STATE=evolve-tailnet-test-ts   # stands in for Render's persistent disk

# Read single values from .env.local without sourcing the whole file (or echoing secrets).
env_local() { grep -E "^[[:space:]]*$1[[:space:]]*=" .env.local 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }

HOSTNAME_TS="${TS_HOSTNAME:-$(env_local TS_HOSTNAME)}"
HOSTNAME_TS="${HOSTNAME_TS:-evolve-test}"
if [ "$HOSTNAME_TS" = "evolve" ]; then
  echo "TS_HOSTNAME=evolve is reserved for the Render deploy — use another name for local tests."
  exit 1
fi

case "${1:-up}" in
down)
  docker rm -f "$APP" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker volume rm "$TS_STATE" >/dev/null 2>&1 || true
  echo "Removed. Also delete the '$HOSTNAME_TS' machine in the Tailscale admin console."
  exit 0 ;;
restart) docker restart "$APP" >/dev/null && docker logs -f --since 2s "$APP"; exit 0 ;;
logs) docker logs -f "$APP"; exit 0 ;;
up) ;;
*) echo "usage: $0 [up|restart|logs|down]"; exit 1 ;;
esac

TS_AUTHKEY=$(env_local TS_AUTHKEY)
ALLOWED_EMAILS=$(env_local ALLOWED_EMAILS)
[ -n "$TS_AUTHKEY" ] || { echo "TS_AUTHKEY missing in .env.local"; exit 1; }
[ -n "$ALLOWED_EMAILS" ] || { echo "ALLOWED_EMAILS missing in .env.local"; exit 1; }

# Tailnet DNS suffix from the Tailscale CLI on this machine (e.g. tail1234.ts.net).
SUFFIX=$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["MagicDNSSuffix"])')
URL="https://$HOSTNAME_TS.$SUFFIX"

echo "→ building image"
docker build -q -t evolve:local . >/dev/null

docker network create "$NET" >/dev/null 2>&1 || true
if ! docker ps --format '{{.Names}}' | grep -qx "$DB"; then
  echo "→ starting throwaway Postgres"
  docker run -d --name "$DB" --network "$NET" \
    -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=evolve postgres:17-alpine >/dev/null
  until docker exec "$DB" pg_isready -U postgres -q 2>/dev/null; do sleep 1; done
fi

echo "→ starting app (no published ports)"
docker rm -f "$APP" >/dev/null 2>&1 || true
docker run -d --name "$APP" --network "$NET" \
  -v "$TS_STATE":/var/lib/tailscale \
  -e TS_AUTHKEY="$TS_AUTHKEY" \
  -e TS_HOSTNAME="$HOSTNAME_TS" \
  -e DATABASE_URL="postgres://postgres:testpw@$DB:5432/evolve" \
  -e BETTER_AUTH_URL="$URL" \
  -e BETTER_AUTH_SECRET="$(openssl rand -hex 32)" \
  -e ALLOWED_EMAILS="$ALLOWED_EMAILS" \
  -e APP_TIMEZONE=Europe/London \
  evolve:local >/dev/null

echo "→ waiting for the app"
for _ in $(seq 1 60); do
  docker logs "$APP" 2>&1 | grep -q "Listening on" && break
  if ! docker ps --format '{{.Names}}' | grep -qx "$APP"; then
    echo "✗ container exited:"; docker logs "$APP" 2>&1 | tail -20; exit 1
  fi
  sleep 1
done
docker logs "$APP" 2>&1 | grep -E "^\[(start|migrate)\]|Listening on" || true
echo
echo "✓ Open from any tailnet device:  $URL"
echo "  (first HTTPS request can take ~10–30 s while Tailscale gets the certificate)"
echo "  logs: $0 logs    restart: $0 restart    clean up: $0 down"

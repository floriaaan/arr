#!/bin/sh
set -e

# Only the main server invocation runs migrations. compose.yml's reconciler /
# watchlist-sync / health services share this same image but override
# `command` to start their own long-running process instead — if each of
# them also ran migrations on boot, N containers starting together would
# race to apply the same pending migration (AdonisJS's runner has no
# distributed lock). Sniffing argv rather than an env var keeps the
# drop-in compose in the README working with zero extra config: the
# default `CMD` matches, every overridden `command:` doesn't.
if [ "$1" = "node" ] && [ "$2" = "bin/server.js" ]; then
  echo "Running database migrations..."
  node bin/console.js migration:run --force
fi

exec "$@"

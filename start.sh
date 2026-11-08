#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${BRIDGE_PORT:-8787}"
export BRIDGE_PORT="$PORT"
export BRIDGE_LOG_FILE="$DIR/bridge.log"

printf '\n  ==================================================\n'
printf '   qoder-claude - Qoder models inside Claude Code\n'
printf '  ==================================================\n'
printf '   port  : %s\n' "$PORT"
printf '   url   : http://127.0.0.1:%s\n' "$PORT"
printf '   log   : %s\n\n' "$BRIDGE_LOG_FILE"
printf '   Close this window (or Ctrl+C) to stop the server.\n\n'

if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "  [i] a server is already running on this port."
  echo "      close this window. to restart: ./stop.sh then ./start.sh."
  exit 0
fi

NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ] && [ -x "$HOME/.local/node/bin/node" ]; then
  NODE="$HOME/.local/node/bin/node"
fi
if [ -z "$NODE" ]; then
  echo "  [x] node not found. run the installer again." >&2
  exit 1
fi

echo $$ > "$DIR/bridge.pid"
exec "$NODE" "$DIR/src/server.js"

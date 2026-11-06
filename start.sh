#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${BRIDGE_PORT:-8787}"
export BRIDGE_PORT="$PORT"
export BRIDGE_LOG_FILE="$DIR/bridge.log"

printf '\n  ==================================================\n'
printf '   qoder-bridge - Qoder models inside Claude Code\n'
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

exec node "$DIR/src/server.js"

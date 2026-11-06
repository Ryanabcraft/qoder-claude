#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${BRIDGE_PORT:-8787}"
export BRIDGE_PORT="$PORT"
export BRIDGE_LOG_FILE="$DIR/bridge.log"

printf '\n  ==================================================\n'
printf '   qoder-bridge - modelos do Qoder no Claude Code\n'
printf '  ==================================================\n'
printf '   porta : %s\n' "$PORT"
printf '   url   : http://127.0.0.1:%s\n' "$PORT"
printf '   log   : %s\n\n' "$BRIDGE_LOG_FILE"
printf '   Feche esta janela (ou Ctrl+C) para parar o servidor.\n\n'

if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "  [i] ja existe um servidor no ar nesta porta."
  echo "      feche esta janela. para reiniciar: ./stop.sh e ./start.sh."
  exit 0
fi

exec node "$DIR/src/server.js"

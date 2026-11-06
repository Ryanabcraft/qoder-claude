#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${BRIDGE_PORT:-8787}"
PIDFILE="$DIR/bridge.pid"

if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    echo "parado (pid $PID)"
  else
    echo "pid $PID nao estava rodando"
  fi
  rm -f "$PIDFILE"
  exit 0
fi

if command -v pkill >/dev/null 2>&1; then
  pkill -f "node .*qoder-bridge/src/server.js" 2>/dev/null && echo "parado" || echo "nada para parar"
else
  echo "sem pidfile e sem pkill; nada para parar"
fi

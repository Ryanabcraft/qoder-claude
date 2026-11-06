#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${BRIDGE_PORT:-8787}"

if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "ja no ar em 127.0.0.1:$PORT"
  exit 0
fi

nohup node "$DIR/src/server.js" >> "$DIR/bridge.log" 2>&1 &
PID=$!
echo "$PID" > "$DIR/bridge.pid"
echo "subindo (pid $PID)..."

i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "no ar em 127.0.0.1:$PORT"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "nao respondeu; veja $DIR/bridge.log"
exit 1

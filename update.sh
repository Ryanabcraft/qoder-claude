#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="Ryanabcraft/qoder-claude"
BRANCH="main"
NO_START=0

while [ $# -gt 0 ]; do
  case "$1" in
    --no-start) NO_START=1 ;;
    -h|--help) echo "usage: update.sh [--no-start]"; exit 0 ;;
    *) echo "unknown flag: $1"; exit 1 ;;
  esac
  shift
done

echo "[1/4] checking qodercli and claude..."
npm install -g @qoder-ai/qodercli >/dev/null 2>&1 || \
  npm install -g --prefix "$HOME/.local" @qoder-ai/qodercli >/dev/null 2>&1 || true
if command -v claude >/dev/null 2>&1; then
  echo "    claude present"
else
  echo "    claude missing; installing"
  npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || \
    npm install -g --prefix "$HOME/.local" @anthropic-ai/claude-code >/dev/null 2>&1 || true
  command -v claude >/dev/null 2>&1 || echo "    install it manually: npm i -g @anthropic-ai/claude-code"
fi

echo "[2/4] updating the bridge..."
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t qoder-bridge)
STAGE="$DIR/.update-stage"
trap 'rm -rf "${TMP:-}" "${STAGE:-}"' EXIT
rm -rf "$STAGE"
mkdir -p "$STAGE"

if curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP/src.tar.gz"; then
  tar -xzf "$TMP/src.tar.gz" -C "$STAGE"
  SRC="$STAGE/${REPO##*/}-$BRANCH"
  if [ -f "$SRC/src/server.js" ]; then
    # rename the shell scripts first: cp onto update.sh itself fails with "text file busy"
    for f in "$SRC"/*.sh; do
      if [ -e "$f" ]; then mv -f "$f" "$DIR/$(basename "$f")"; fi
    done
    cp -R "$SRC"/. "$DIR"/
    chmod +x "$DIR"/*.sh 2>/dev/null || true
    echo "    code updated"
  else
    echo "    invalid package; keeping the local copy"
  fi
else
  echo "    download failed; keeping the local copy"
fi
rm -rf "$STAGE"

echo "[3/4] rewriting settings and model picker..."
QODER_CLAUDE_TARGET="$HOME" node "$DIR/scripts/enable-here.js"

if [ "$NO_START" -eq 1 ]; then
  echo "[4/4] server restart skipped (--no-start)"
else
  echo "[4/4] restarting the server..."
  "$DIR/stop.sh" >/dev/null 2>&1 || true
  sleep 1
  PORT="${BRIDGE_PORT:-8787}"
  if node "$DIR/bin/qclaude.js" --window >/dev/null 2>&1; then
    echo "    server window opened at 127.0.0.1:$PORT"
  else
    nohup node "$DIR/src/server.js" >> "$DIR/bridge.log" 2>&1 &
    echo $! > "$DIR/bridge.pid"
    i=0
    while [ "$i" -lt 30 ]; do
      if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
        echo "    running at 127.0.0.1:$PORT (pid $(cat "$DIR/bridge.pid"))"
        break
      fi
      i=$((i + 1))
      sleep 1
    done
    [ "$i" -lt 30 ] || echo "    did not respond; see $DIR/bridge.log"
  fi
fi

echo
echo "done. restart claude to reload /model."

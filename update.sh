#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="Ryanabcraft/qoder-claude"
BRANCH="main"
if ! command -v node >/dev/null 2>&1 && [ -x "$HOME/.local/node/bin/node" ]; then
  PATH="$HOME/.local/node/bin:$PATH"
  export PATH
fi
STAGE="$DIR/.update-stage"
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t qoder-bridge)
trap 'rm -rf "${TMP:-}" "${STAGE:-}"' EXIT

while [ $# -gt 0 ]; do
  case "$1" in
    --no-start) ;;  # accepted for compatibility; the updater never starts the server
    -h|--help) echo "usage: update.sh"; exit 0 ;;
    *) echo "unknown flag: $1"; exit 1 ;;
  esac
  shift
done

echo "[1/4] checking qodercli and claude..."
npm install -g @qoder-ai/qodercli >/dev/null 2>&1 || \
  npm install -g --prefix "$HOME/.local" @qoder-ai/qodercli >/dev/null 2>&1 || true
if command -v claude >/dev/null 2>&1 && claude --version >/dev/null 2>&1; then
  echo "    claude present"
else
  echo "    claude missing; running the official installer"
  curl -fsSL "https://claude.ai/install.sh" -o "$TMP/claude-install.sh" && bash "$TMP/claude-install.sh" || true
  export PATH="$HOME/.local/bin:$PATH"
  if ! (command -v claude >/dev/null 2>&1 && claude --version >/dev/null 2>&1); then
    npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || \
      npm install -g --prefix "$HOME/.local" @anthropic-ai/claude-code >/dev/null 2>&1 || true
  fi
  (command -v claude >/dev/null 2>&1 && claude --version >/dev/null 2>&1) || echo "    install it manually: curl -fsSL https://claude.ai/install.sh | bash"
fi

echo "[2/4] updating the bridge..."
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

echo "[4/4] stopping the old server..."
"$DIR/stop.sh" >/dev/null 2>&1 || true
sleep 1
if curl -fsS "http://127.0.0.1:${BRIDGE_PORT:-8787}/health" >/dev/null 2>&1; then
  echo "    a server is still answering; stop it with: $DIR/stop.sh"
else
  echo "    stopped"
fi

echo
echo "done. start with: qclaude"

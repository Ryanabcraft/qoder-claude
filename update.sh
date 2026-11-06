#!/usr/bin/env bash
set -eu
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="Ryanabcraft/qoder-claude"
BRANCH="main"

echo "[1/4] atualizando qodercli..."
npm install -g @qoder-ai/qodercli >/dev/null 2>&1 || \
  npm install -g --prefix "$HOME/.local" @qoder-ai/qodercli >/dev/null 2>&1 || true

echo "[2/4] atualizando o bridge..."
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t qoder-bridge)
trap 'rm -rf "$TMP"' EXIT
if curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP/src.tar.gz"; then
  tar -xzf "$TMP/src.tar.gz" -C "$TMP"
  SRC="$TMP/qoder-bridge-$BRANCH"
  if [ -f "$SRC/src/server.js" ]; then
    cp -R "$SRC"/. "$DIR"/
    echo "    codigo atualizado"
  else
    echo "    pacote invalido; seguindo com o local"
  fi
else
  echo "    download falhou; seguindo com o local"
fi

echo "[3/4] regravando settings e model picker..."
QODER_CLAUDE_TARGET="$HOME" node "$DIR/scripts/enable-here.js"

echo "[4/4] reiniciando o servidor..."
"$DIR/stop.sh" >/dev/null 2>&1 || true
PORT="${BRIDGE_PORT:-8787}"
nohup node "$DIR/src/server.js" >> "$DIR/bridge.log" 2>&1 &
echo $! > "$DIR/bridge.pid"

i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "    no ar em 127.0.0.1:$PORT (pid $(cat "$DIR/bridge.pid"))"
    break
  fi
  i=$((i + 1))
  sleep 1
done
[ "$i" -lt 30 ] || echo "    nao respondeu; veja $DIR/bridge.log"

echo
echo "pronto. reinicie o claude para recarregar o /model."

#!/usr/bin/env bash
# qoder-bridge installer for Linux and macOS
set -eu

REPO="Ryanabcraft/qoder-claude"
BRANCH="main"
PORT="${BRIDGE_PORT:-8787}"
INSTALL_DIR="${QODER_BRIDGE_HOME:-$HOME/.local/share/qoder-bridge}"
NO_START=0
PROJECT_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --no-start) NO_START=1 ;;
    --project-only) PROJECT_ONLY=1 ;;
    --dir) shift; INSTALL_DIR="$1" ;;
    -h|--help)
      echo "uso: install.sh [--no-start] [--project-only] [--dir <path>]"
      exit 0 ;;
    *) echo "flag desconhecida: $1"; exit 1 ;;
  esac
  shift
done

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
ok()   { printf '    \033[32mok\033[0m  %s\n' "$1"; }
warn() { printf '    \033[33m!!\033[0m  %s\n' "$1"; }
die()  { printf '\n    \033[31mx\033[0m   %s\n' "$1"; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }

step "Checking dependencies"
have node || die "Node.js 20+ not found. Install it from https://nodejs.org or use nvm."
have curl || die "curl not found."
have tar  || die "tar not found."

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node 20+ required (current: $(node -v))."
ok "node $(node -v)"

step "Downloading the bridge"
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t qoder-bridge)
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP/src.tar.gz" \
  || die "download failed."
tar -xzf "$TMP/src.tar.gz" -C "$TMP"
SRC="$TMP/qoder-bridge-$BRANCH"
[ -f "$SRC/src/server.js" ] || die "invalid package."
ok "source downloaded"

step "Installing the Qoder CLI"
if have qodercli; then
  ok "qodercli $(qodercli --version 2>/dev/null | head -n 1)"
else
  npm install -g @qoder-ai/qodercli >/dev/null 2>&1 || \
    npm install -g --prefix "$HOME/.local" @qoder-ai/qodercli >/dev/null 2>&1 || \
    die "failed to install @qoder-ai/qodercli (try: npm i -g @qoder-ai/qodercli)"
  export PATH="$HOME/.local/bin:$PATH"
  have qodercli || die "qodercli is not on PATH. Add \$HOME/.local/bin and run again."
  ok "qodercli installed"
fi

step "Checking Qoder login"
if qodercli status 2>/dev/null | grep -q 'Username:'; then
  ok "$(qodercli status 2>/dev/null | grep 'Username:')"
else
  warn "no active session; opening login"
  qodercli login || die "login failed."
fi

step "Installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R "$SRC"/. "$INSTALL_DIR"/
chmod +x "$INSTALL_DIR"/*.sh 2>/dev/null || true
ok "files copied"

step "Installing the qclaude command"
mkdir -p "$HOME/.local/bin"
printf '#!/usr/bin/env bash\nexec node "%s/bin/qclaude.js" "$@"\n' "$INSTALL_DIR" > "$HOME/.local/bin/qclaude"
chmod +x "$HOME/.local/bin/qclaude"
ok "$HOME/.local/bin/qclaude"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ok "~/.local/bin is already on PATH" ;;
  *) warn "adicione ao PATH: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac

step "Configuring Claude Code"
if [ "$PROJECT_ONLY" -eq 1 ]; then
  QODER_CLAUDE_TARGET="$(pwd)" node "$INSTALL_DIR/scripts/enable-here.js"
else
  QODER_CLAUDE_TARGET="$HOME" node "$INSTALL_DIR/scripts/enable-here.js"
fi

if [ "$NO_START" -eq 0 ]; then
  step "Starting the server"
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    ok "already running at 127.0.0.1:$PORT"
  else
    nohup node "$INSTALL_DIR/src/server.js" >> "$INSTALL_DIR/bridge.log" 2>&1 &
    echo $! > "$INSTALL_DIR/bridge.pid"
    ready=0
    i=0
    while [ $i -lt 30 ]; do
      if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then ready=1; break; fi
      i=$((i + 1))
      sleep 1
    done
    [ "$ready" -eq 1 ] || die "server did not respond; see $INSTALL_DIR/bridge.log"
    ok "server running at 127.0.0.1:$PORT"
  fi
fi

step "Validating"
curl -fsS "http://127.0.0.1:$PORT/v1/models" >/dev/null 2>&1 && ok "/v1/models responds"

printf '\n  \033[32mQoder-Claude installed.\033[0m\n'
printf '  \033[36mOpen with: qclaude\033[0m\n\n'
printf '  bridge    : %s\n' "$INSTALL_DIR"
printf '  port      : %s\n' "$PORT"
printf '  server    : %s/start.sh  (foreground)\n' "$INSTALL_DIR"
printf '  stop      : %s/stop.sh\n' "$INSTALL_DIR"
printf '  update    : %s/update.sh\n' "$INSTALL_DIR"
printf '\n  open a new terminal and run: qclaude\n\n'

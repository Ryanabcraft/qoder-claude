#!/usr/bin/env bash
# qoder-claude installer for Linux and macOS
set -eu

REPO="Ryanabcraft/qoder-claude"
BRANCH="main"
PORT="${BRIDGE_PORT:-8787}"
INSTALL_DIR="${QODER_CLAUDE_HOME:-${QODER_BRIDGE_HOME:-$HOME/.local/share/qoder-claude}}"
NODE_LOCAL="$HOME/.local/node"
PROJECT_ONLY=0
NODE_BIN=""
SKIP_CLAUDE=0
SKIP_LOGIN=0
SKIP_VISION=0
SOURCE_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --no-start) ;;  # accepted for compatibility; the installer never starts the server
    --project-only) PROJECT_ONLY=1 ;;
    --skip-claude) SKIP_CLAUDE=1 ;;
    --skip-login) SKIP_LOGIN=1 ;;
    --skip-vision) SKIP_VISION=1 ;;
    --dir) shift; INSTALL_DIR="$1" ;;
    --source) shift; SOURCE_DIR="$1" ;;
    -h|--help)
      echo "usage: install.sh [--project-only] [--skip-claude] [--skip-login] [--skip-vision] [--dir <path>] [--source <dir>]"
      exit 0 ;;
    *) echo "unknown flag: $1"; exit 1 ;;
  esac
  shift
done

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
ok()   { printf '    \033[32mok\033[0m  %s\n' "$1"; }
warn() { printf '    \033[33m!!\033[0m  %s\n' "$1"; }
die()  { printf '\n    \033[31mx\033[0m   %s\n' "$1"; exit 1; }

have() { command -v "$1" >/dev/null 2>&1; }
claude_ok() { have claude && claude --version >/dev/null 2>&1; }

TMP=$(mktemp -d 2>/dev/null || mktemp -d -t qoder-claude)
trap 'rm -rf "$TMP"' EXIT

node_major() { "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

install_node() {
  local os arch version file want got
  os=$(uname -s)
  arch=$(uname -m)
  case "$os" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) return 1 ;;
  esac
  case "$arch" in
    x86_64|amd64) arch=x64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) return 1 ;;
  esac

  curl -fsSL "https://nodejs.org/dist/index.tab" -o "$TMP/node.tab" || return 1
  version=$(awk -F'\t' 'NR > 1 && $10 != "-" { print $1; exit }' "$TMP/node.tab")
  [ -n "$version" ] || return 1

  file="node-$version-$os-$arch.tar.gz"
  curl -fsSL "https://nodejs.org/dist/$version/$file" -o "$TMP/$file" || return 1
  if curl -fsSL "https://nodejs.org/dist/$version/SHASUMS256.txt" -o "$TMP/sums.txt"; then
    want=$(grep " $file\$" "$TMP/sums.txt" | awk '{print $1}')
    if have sha256sum; then
      got=$(sha256sum "$TMP/$file" | awk '{print $1}')
    elif have shasum; then
      got=$(shasum -a 256 "$TMP/$file" | awk '{print $1}')
    fi
    if [ -n "$want" ] && [ -n "${got:-}" ] && [ "$want" != "$got" ]; then
      warn "checksum mismatch for $file"
      return 1
    fi
  fi

  mkdir -p "$NODE_LOCAL"
  tar -xzf "$TMP/$file" -C "$NODE_LOCAL" --strip-components=1 || return 1
  NODE_BIN="$NODE_LOCAL/bin/node"
  [ -x "$NODE_BIN" ] || return 1
  return 0
}

step "Checking dependencies"
have curl || die "curl not found."
have tar  || die "tar not found."
have awk  || die "awk not found."

if have node && [ "$(node_major "$(command -v node)")" -ge 20 ]; then
  NODE_BIN="$(command -v node)"
  ok "node $(node -v)"
elif [ -x "$NODE_LOCAL/bin/node" ] && [ "$(node_major "$NODE_LOCAL/bin/node")" -ge 20 ]; then
  NODE_BIN="$NODE_LOCAL/bin/node"
  export PATH="$NODE_LOCAL/bin:$PATH"
  ok "node $("$NODE_BIN" -v) (local)"
else
  if have node; then
    warn "node $(node -v) is older than 20; installing the official LTS into $NODE_LOCAL"
  else
    warn "node not found; installing the official LTS into $NODE_LOCAL (no sudo)"
  fi
  install_node || die "could not install Node.js automatically. Install Node 20+ from https://nodejs.org and run again."
  export PATH="$NODE_LOCAL/bin:$PATH"
  ok "node $("$NODE_BIN" -v) at $NODE_LOCAL"
fi

step "Downloading the bridge"
if [ -n "$SOURCE_DIR" ]; then
  SRC="$SOURCE_DIR"
  ok "using local source at $SRC"
else
  curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP/src.tar.gz" \
    || die "download failed."
  tar -xzf "$TMP/src.tar.gz" -C "$TMP"
  SRC="$TMP/${REPO##*/}-$BRANCH"
  ok "source downloaded"
fi
[ -f "$SRC/src/server.js" ] || die "invalid package."

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

step "Installing Claude Code"
if [ "$SKIP_CLAUDE" -eq 1 ]; then
  warn "skipped (--skip-claude)"
elif claude_ok; then
  ok "claude $(claude --version 2>/dev/null | head -n 1)"
else
  if curl -fsSL "https://claude.ai/install.sh" -o "$TMP/claude-install.sh" && bash "$TMP/claude-install.sh"; then
    ok "official installer finished"
  else
    warn "official installer failed; trying npm"
  fi
  export PATH="$HOME/.local/bin:$PATH"
  if ! claude_ok; then
    npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || \
      npm install -g --prefix "$HOME/.local" @anthropic-ai/claude-code >/dev/null 2>&1 || true
  fi
  if claude_ok; then
    ok "claude installed"
  else
    warn "claude is not on PATH; install it with: curl -fsSL https://claude.ai/install.sh | bash"
  fi
fi

step "Checking Qoder login"
if [ "$SKIP_LOGIN" -eq 1 ]; then
  warn "skipped (--skip-login)"
elif qodercli status 2>/dev/null | grep -q 'Username:'; then
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
printf '#!/usr/bin/env bash\nexec "%s" "%s/bin/qclaude.js" "$@"\n' "$NODE_BIN" "$INSTALL_DIR" > "$HOME/.local/bin/qclaude"
chmod +x "$HOME/.local/bin/qclaude"
ok "$HOME/.local/bin/qclaude"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ok "~/.local/bin is already on PATH" ;;
  *)
    warn "~/.local/bin is not on PATH. Add this line to ~/.bashrc or ~/.zshrc:"
    printf '        export PATH="$HOME/.local/bin:$PATH"\n' ;;
esac
if [ "$NODE_BIN" = "$NODE_LOCAL/bin/node" ]; then
  case ":$PATH:" in
    *":$NODE_LOCAL/bin:"*) ;;
    *)
      warn "add Node to PATH for start.sh/update.sh too:"
      printf '        export PATH="$HOME/.local/node/bin:$PATH"\n' ;;
  esac
fi

step "Configuring Claude Code"
if [ "$PROJECT_ONLY" -eq 1 ]; then
  QODER_CLAUDE_TARGET="$(pwd)" "$NODE_BIN" "$INSTALL_DIR/scripts/enable-here.js"
else
  QODER_CLAUDE_TARGET="$HOME" "$NODE_BIN" "$INSTALL_DIR/scripts/enable-here.js"
fi

if [ "$SKIP_VISION" -eq 0 ]; then
  step "Installing the vision engine (images)"
  if "$NODE_BIN" "$INSTALL_DIR/bin/qclaude.js" vision install; then
    ok "image support ready"
  else
    warn "vision engine not installed; run later with: qclaude vision install"
  fi
fi

printf '\n  \033[32mQoder-Claude installed.\033[0m\n\n'
printf '  \033[36mStart with: qclaude\033[0m\n\n'
printf '  qclaude starts the bridge, opens the dashboard, then opens claude, and stops the bridge when claude exits.\n\n'
printf '  bridge    : %s\n' "$INSTALL_DIR"
printf '  port      : %s\n' "$PORT"
printf '  logs      : %s/bridge.log\n' "$INSTALL_DIR"
printf '  stop      : %s/stop.sh\n' "$INSTALL_DIR"
printf '  update    : %s/update.sh\n' "$INSTALL_DIR"
printf '\n  open a new terminal first so qclaude is on PATH.\n\n'
if [ -d "$HOME/.local/share/qoder-bridge" ] && [ "$HOME/.local/share/qoder-bridge" != "$INSTALL_DIR" ]; then
  printf '  older install found: %s (check `command -v qclaude`, then delete it)\n\n' "$HOME/.local/share/qoder-bridge"
fi

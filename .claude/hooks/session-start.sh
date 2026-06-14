#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

FABRIC_BIN="$HOME/.local/bin/fabric"
FABRIC_VERSION="v1.4.452"
FABRIC_ENV="$HOME/.config/fabric/.env"

# --- Install fabric binary if missing ---
if [ ! -x "$FABRIC_BIN" ]; then
  echo "[session-start] Installing fabric ${FABRIC_VERSION}..."
  mkdir -p "$HOME/.local/bin"
  curl -sSL "https://github.com/danielmiessler/fabric/releases/download/${FABRIC_VERSION}/fabric_Linux_x86_64.tar.gz" \
    -o /tmp/fabric.tar.gz
  tar -xzf /tmp/fabric.tar.gz -C /tmp/
  cp /tmp/fabric "$FABRIC_BIN"
  chmod +x "$FABRIC_BIN"
  rm -f /tmp/fabric.tar.gz /tmp/fabric
  echo "[session-start] fabric installed: $($FABRIC_BIN --version)"
else
  echo "[session-start] fabric already installed: $($FABRIC_BIN --version)"
fi

# --- Ensure PATH includes fabric for this session ---
echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "${CLAUDE_ENV_FILE:-/dev/null}"

# --- Write fabric .env with API key from session env ---
mkdir -p "$(dirname "$FABRIC_ENV")"

cat > "$FABRIC_ENV" << EOF
PATTERNS_LOADER_GIT_REPO_URL=https://github.com/danielmiessler/fabric.git
PATTERNS_LOADER_GIT_REPO_PATTERNS_FOLDER=data/patterns
PROMPT_STRATEGIES_GIT_REPO_URL=https://github.com/danielmiessler/fabric.git
PROMPT_STRATEGIES_GIT_REPO_STRATEGIES_FOLDER=data/strategies
ANTHROPIC_API_KEY=${FABRIC_ANTHROPIC_API_KEY:-}
DEFAULT_VENDOR=Anthropic
DEFAULT_MODEL=claude-sonnet-4-6
EOF

echo "[session-start] fabric .env written."

# --- Download patterns if missing ---
PATTERNS_DIR="$HOME/.config/fabric/patterns"
if [ ! -d "$PATTERNS_DIR" ] || [ "$(ls -A "$PATTERNS_DIR" 2>/dev/null | wc -l)" -eq 0 ]; then
  echo "[session-start] Downloading fabric patterns..."
  "$FABRIC_BIN" --updatepatterns 2>&1 | tail -3
else
  echo "[session-start] fabric patterns already present ($(ls "$PATTERNS_DIR" | wc -l) patterns)."
fi

echo "[session-start] fabric setup complete."

#!/usr/bin/env bash
set -Eeuo pipefail

# Ai2 Ubuntu installer
# Installs the host dependencies needed by the current Ai2 repository.
# Optional services (Ollama, Docker, Wan2.2, ComfyUI) are not installed by default.

APP_DIR="${AI2_INSTALL_DIR:-$HOME/Ai2}"
NODE_MAJOR=20

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
  TARGET_HOME="${HOME}"
else
  SUDO="sudo"
  TARGET_HOME="${HOME}"
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "ERROR: This installer supports Ubuntu/Linux only." >&2
  exit 1
fi

if [[ -r /etc/os-release ]]; then
  . /etc/os-release
else
  echo "ERROR: Cannot detect Linux distribution." >&2
  exit 1
fi

if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "ERROR: This installer is for Ubuntu. Detected: ${ID:-unknown}" >&2
  exit 1
fi

case "${VERSION_ID:-}" in
  22.04|24.04|26.04) ;;
  *) echo "WARNING: Ubuntu ${VERSION_ID:-unknown} is not one of the tested LTS releases (22.04/24.04/26.04). Continuing." ;;
esac

echo "==> Installing system packages"
$SUDO apt-get update
$SUDO apt-get install -y \
  ca-certificates curl git build-essential cmake pkg-config \
  python3 python3-full python3-venv python3-pip \
  nginx ffmpeg jq unzip tar

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if command -v node >/dev/null 2>&1; then
  CURRENT_NODE="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
else
  CURRENT_NODE=""
fi

if [[ "${CURRENT_NODE}" != "${NODE_MAJOR}" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

NODE_VERSION="$(node --version)"
NPM_VERSION="$(npm --version)"
echo "    Node: ${NODE_VERSION}"
echo "    npm:  ${NPM_VERSION}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "==> Cloning Ai2 into ${APP_DIR}"
  git clone https://github.com/xDarkixx/Ai2.git "${APP_DIR}"
else
  echo "==> Ai2 repository already exists at ${APP_DIR}; updating it"
  git -C "${APP_DIR}" pull --ff-only
fi

cd "${APP_DIR}"

echo "==> Installing Ai2 Node dependencies"
npm install

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  sed -i 's/^LLM_PROVIDER=.*/LLM_PROVIDER=demo/' .env
  sed -i 's/^COMFYUI_ENABLED=.*/COMFYUI_ENABLED=false/' .env
  sed -i 's/^WAN22_ENABLED=.*/WAN22_ENABLED=false/' .env
fi

echo "==> Building native Ai2 engine"
cmake -S native -B build
cmake --build build --config Release

# Make the native binary available through the configured default path.
if [[ -x "${APP_DIR}/build/ai2_native" ]]; then
  echo "    Native engine: ${APP_DIR}/build/ai2_native"
fi

echo "==> Running installation checks"
npm run check
python3 -m py_compile wan22/runner.py
printf '%s\n' '{"op":"ping"}' | ./build/ai2_native --bridge >/tmp/ai2-native-ping.txt
cat /tmp/ai2-native-ping.txt

# Do not enable nginx globally or start Ai2 automatically without explicit user action.
# The production nginx configuration remains on port 80; CI uses an unprivileged test port.

echo
cat <<EOF
Ai2 installation completed.

Install directory: ${APP_DIR}
Start Ai2:
  cd "${APP_DIR}"
  npm start

Open:
  http://127.0.0.1:3000

For local LLM support, install/configure Ollama separately and set OLLAMA_* in .env.
For image/video generation, configure ComfyUI and/or Wan2.2 separately; their large model
weights are intentionally not downloaded by this installer.
EOF

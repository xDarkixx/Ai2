#!/usr/bin/env bash
set -Eeuo pipefail

# Ai2 Ubuntu installer
# Installs the required Linux build/runtime dependencies, builds Ai2 and can
# optionally install Ollama and configure NGINX. Large AI model weights are
# never downloaded unless --with-ollama is explicitly supplied.

APP_DIR="${AI2_INSTALL_DIR:-$HOME/Ai2}"
NODE_MAJOR=20
WITH_OLLAMA=0
WITH_NGINX=0
ENABLE_SERVICE=1
OLLAMA_MODEL="qwen3:0.6b-q4_K_M"

usage() {
  cat <<'EOF'
Ai2 Ubuntu installer

Usage: ./install-ubuntu.sh [options]

Options:
  --with-ollama       Install Ollama and pull the small default local model.
  --with-nginx        Install/enable the Ai2 NGINX reverse-proxy site.
  --no-service        Do not install/enable the Ai2 systemd service.
  --install-dir DIR   Install/update Ai2 in DIR (default: ~/Ai2).
  --ollama-model MOD  Ollama model to pull with --with-ollama.
  --help              Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-ollama) WITH_OLLAMA=1; shift ;;
    --with-nginx) WITH_NGINX=1; shift ;;
    --no-service) ENABLE_SERVICE=0; shift ;;
    --install-dir) APP_DIR="$2"; shift 2 ;;
    --ollama-model) OLLAMA_MODEL="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "ERROR: Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

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

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
  RUN_USER="${SUDO_USER:-root}"
  if [[ "${RUN_USER}" != "root" ]]; then
    RUN_HOME="$(getent passwd "${RUN_USER}" | cut -d: -f6)"
  else
    RUN_HOME="${HOME}"
  fi
else
  SUDO="sudo"
  RUN_USER="${USER}"
  RUN_HOME="${HOME}"
fi

if [[ "${APP_DIR}" == "\$HOME/"* ]]; then
  APP_DIR="${RUN_HOME}${APP_DIR#\$HOME}"
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing required Ubuntu packages"
$SUDO apt-get update
$SUDO apt-get install -y \
  ca-certificates curl git build-essential cmake pkg-config \
  python3 python3-full python3-venv python3-pip \
  nginx ffmpeg jq unzip tar

echo "==> Installing Node.js ${NODE_MAJOR}.x"
CURRENT_NODE=""
if command -v node >/dev/null 2>&1; then
  CURRENT_NODE="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
fi
if [[ "${CURRENT_NODE}" != "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
node --version
npm --version

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "==> Cloning Ai2 into ${APP_DIR}"
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone https://github.com/xDarkixx/Ai2.git "${APP_DIR}"
else
  echo "==> Updating existing Ai2 checkout"
  git -C "${APP_DIR}" pull --ff-only
fi

cd "${APP_DIR}"

if [[ "${RUN_USER}" != "root" ]]; then
  $SUDO chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}"
fi

echo "==> Installing Ai2 Node dependencies"
npm install

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
  sed -i 's/^LLM_PROVIDER=.*/LLM_PROVIDER=ollama/' .env
  sed -i 's/^COMFYUI_ENABLED=.*/COMFYUI_ENABLED=false/' .env
  sed -i 's/^WAN22_ENABLED=.*/WAN22_ENABLED=false/' .env
fi

if [[ "${WITH_OLLAMA}" -eq 1 ]]; then
  echo "==> Installing Ollama"
  if ! command -v ollama >/dev/null 2>&1; then
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl enable --now ollama || true
  fi
  echo "==> Pulling Ollama model: ${OLLAMA_MODEL}"
  ollama pull "${OLLAMA_MODEL}"
  sed -i "s/^OLLAMA_MODEL=.*/OLLAMA_MODEL=${OLLAMA_MODEL}/" .env
  if grep -q '^AI2_LOCAL_MODELS=' .env; then
    sed -i "s/^AI2_LOCAL_MODELS=.*/AI2_LOCAL_MODELS=${OLLAMA_MODEL}/" .env
  fi
fi

echo "==> Building native Ai2 engine"
cmake -S native -B build
cmake --build build --config Release

echo "==> Running installation checks"
npm run check
python3 -m py_compile wan22/runner.py
printf '%s\n' '{"op":"ping"}' | ./build/ai2_native --bridge

if [[ "${ENABLE_SERVICE}" -eq 1 ]] && command -v systemctl >/dev/null 2>&1; then
  echo "==> Installing Ai2 systemd service"
  SERVICE_TMP="$(mktemp)"
  sed \
    -e "s|__AI2_USER__|${RUN_USER}|g" \
    -e "s|__AI2_DIR__|${APP_DIR}|g" \
    deploy/systemd/ai2.service > "${SERVICE_TMP}"
  $SUDO install -m 0644 "${SERVICE_TMP}" /etc/systemd/system/ai2.service
  rm -f "${SERVICE_TMP}"
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ai2
  $SUDO systemctl restart ai2
  sleep 2
  $SUDO systemctl --no-pager --full status ai2 || true
fi

if [[ "${WITH_NGINX}" -eq 1 ]]; then
  echo "==> Installing Ai2 NGINX reverse proxy"
  $SUDO install -m 0644 deploy/nginx/ai2-site.conf /etc/nginx/sites-available/ai2
  $SUDO ln -sfn /etc/nginx/sites-available/ai2 /etc/nginx/sites-enabled/ai2
  $SUDO rm -f /etc/nginx/sites-enabled/default
  $SUDO nginx -t
  $SUDO systemctl enable --now nginx
  $SUDO systemctl reload nginx
fi

echo
cat <<EOF
Ai2 installation completed successfully.

Install directory: ${APP_DIR}

Core service:
  systemctl status ai2
  systemctl restart ai2
  journalctl -u ai2 -f

Direct URL:
  http://127.0.0.1:3000

NGINX URL (when --with-nginx was used):
  http://127.0.0.1/

Ollama was installed: $([[ "${WITH_OLLAMA}" -eq 1 ]] && echo yes || echo no)
NGINX was configured: $([[ "${WITH_NGINX}" -eq 1 ]] && echo yes || echo no)

Optional heavy components such as ComfyUI/Wan2.2 model weights are intentionally
not downloaded automatically.
EOF

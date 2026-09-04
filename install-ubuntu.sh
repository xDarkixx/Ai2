#!/usr/bin/env bash
set -Eeuo pipefail

# Ai2 Ubuntu installer
# Linux/Ubuntu only. Optional services are installed only when requested.

APP_DIR="${AI2_INSTALL_DIR:-$HOME/Ai2}"
COMFYUI_ROOT="${AI2_COMFYUI_ROOT:-/opt/ai2-comfyui}"
NODE_MAJOR=20
WITH_OLLAMA=0
WITH_NGINX=0
WITH_COMFYUI=0
ENABLE_SERVICE=1
OLLAMA_MODEL="qwen3:0.6b-q4_K_M"

usage() {
  cat <<'EOF'
Ai2 Ubuntu installer

Usage: ./install-ubuntu.sh [options]

Options:
  --with-ollama       Install Ollama and pull the selected local model.
  --with-nginx        Install/enable the Ai2 NGINX reverse proxy.
  --with-comfyui      Install the official ComfyUI runtime and enable its service.
  --no-service        Do not install/enable the Ai2 systemd service.
  --install-dir DIR   Install/update Ai2 in DIR (default: ~/Ai2).
  --comfyui-dir DIR   ComfyUI runtime directory (default: /opt/ai2-comfyui).
  --ollama-model MOD  Ollama model to pull with --with-ollama.
  --help              Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-ollama) WITH_OLLAMA=1; shift ;;
    --with-nginx) WITH_NGINX=1; shift ;;
    --with-comfyui) WITH_COMFYUI=1; shift ;;
    --no-service) ENABLE_SERVICE=0; shift ;;
    --install-dir) [[ $# -ge 2 ]] || { echo 'ERROR: --install-dir needs a value' >&2; exit 2; }; APP_DIR="$2"; shift 2 ;;
    --comfyui-dir) [[ $# -ge 2 ]] || { echo 'ERROR: --comfyui-dir needs a value' >&2; exit 2; }; COMFYUI_ROOT="$2"; shift 2 ;;
    --ollama-model) [[ $# -ge 2 ]] || { echo 'ERROR: --ollama-model needs a value' >&2; exit 2; }; OLLAMA_MODEL="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "ERROR: Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$(uname -s)" == "Linux" ]] || { echo 'ERROR: This installer supports Ubuntu/Linux only.' >&2; exit 1; }
[[ -r /etc/os-release ]] || { echo 'ERROR: Cannot detect Linux distribution.' >&2; exit 1; }
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || { echo "ERROR: This installer is for Ubuntu. Detected: ${ID:-unknown}" >&2; exit 1; }
case "${VERSION_ID:-}" in 22.04|24.04|26.04) ;; *) echo "WARNING: Ubuntu ${VERSION_ID:-unknown} is not one of the tested LTS releases (22.04/24.04/26.04). Continuing." ;; esac

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
  RUN_USER="${SUDO_USER:-root}"
  RUN_HOME="${RUN_USER}" && [[ "${RUN_USER}" != root ]] && RUN_HOME="$(getent passwd "${RUN_USER}" | cut -d: -f6)"
else
  SUDO="sudo"
  RUN_USER="${USER}"
  RUN_HOME="${HOME}"
fi
[[ "${APP_DIR}" == \$HOME/* ]] && APP_DIR="${RUN_HOME}${APP_DIR#\$HOME}"

export DEBIAN_FRONTEND=noninteractive

echo '==> Installing required Ubuntu packages'
$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl git build-essential cmake pkg-config openssl python3 python3-full python3-venv python3-pip ffmpeg jq unzip tar
if [[ "${WITH_NGINX}" -eq 1 ]]; then
  $SUDO apt-get install -y nginx
fi

CURRENT_NODE=""
command -v node >/dev/null 2>&1 && CURRENT_NODE="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
if [[ "${CURRENT_NODE}" != "${NODE_MAJOR}" ]]; then
  echo "==> Installing Node.js ${NODE_MAJOR}.x"
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
[[ "${RUN_USER}" == root ]] || $SUDO chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}"

echo '==> Installing Ai2 Node dependencies'
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi

if [[ ! -f .env ]]; then
  echo '==> Creating .env from .env.example'
  cp .env.example .env
fi
# Fresh installs use local-first defaults. Existing user configuration is otherwise preserved.
if [[ ! -s .env ]]; then cp .env.example .env; fi
sed -i 's/^LLM_PROVIDER=.*/LLM_PROVIDER=ollama/' .env
sed -i 's/^COMFYUI_ENABLED=.*/COMFYUI_ENABLED=false/' .env
sed -i 's/^WAN22_ENABLED=.*/WAN22_ENABLED=false/' .env

# Never leave the documented placeholder as a production payment secret.
if grep -q '^AI2_PAYMENT_SECRET=change-this-to-a-long-random-server-secret$' .env || ! grep -q '^AI2_PAYMENT_SECRET=.' .env; then
  sed -i "s|^AI2_PAYMENT_SECRET=.*|AI2_PAYMENT_SECRET=$(openssl rand -hex 32)|" .env
fi
if ! grep -q '^AI2_ADMIN_TOKEN=.' .env; then
  sed -i "s|^AI2_ADMIN_TOKEN=.*|AI2_ADMIN_TOKEN=$(openssl rand -hex 32)|" .env
fi

if [[ "${WITH_OLLAMA}" -eq 1 ]]; then
  echo '==> Installing Ollama'
  if ! command -v ollama >/dev/null 2>&1; then curl -fsSL https://ollama.com/install.sh | sh; fi
  if command -v systemctl >/dev/null 2>&1; then $SUDO systemctl enable --now ollama || true; fi
  echo "==> Pulling Ollama model: ${OLLAMA_MODEL}"
  ollama pull "${OLLAMA_MODEL}"
  sed -i "s/^OLLAMA_MODEL=.*/OLLAMA_MODEL=${OLLAMA_MODEL}/" .env
  sed -i "s/^AI2_LOCAL_MODELS=.*/AI2_LOCAL_MODELS=${OLLAMA_MODEL}/" .env
fi

if [[ "${WITH_COMFYUI}" -eq 1 ]]; then
  echo "==> Installing official ComfyUI runtime in ${COMFYUI_ROOT}"
  AI2_COMFYUI_ROOT="${COMFYUI_ROOT}" $SUDO -E bash "${APP_DIR}/comfyui/install-linux.sh"
  $SUDO chown -R "${RUN_USER}:${RUN_USER}" "${COMFYUI_ROOT}"
  sed -i 's/^COMFYUI_ENABLED=.*/COMFYUI_ENABLED=true/' .env
  if grep -q '^COMFYUI_GATEWAY_PORT=' .env; then
    sed -i 's/^COMFYUI_GATEWAY_PORT=.*/COMFYUI_GATEWAY_PORT=3030/' .env
  else
    printf '\nCOMFYUI_GATEWAY_PORT=3030\n' >> .env
  fi
fi
chmod 600 .env

echo '==> Building native Ai2 engine'
cmake -S native -B build
cmake --build build --config Release

echo '==> Running installation checks'
npm run check
python3 -m py_compile wan22/runner.py
printf '%s\n' '{"op":"ping"}' | ./build/ai2_native --bridge

if [[ "${ENABLE_SERVICE}" -eq 1 ]] && command -v systemctl >/dev/null 2>&1; then
  echo '==> Installing Ai2 systemd service'
  SERVICE_TMP="$(mktemp)"
  sed -e "s|__AI2_USER__|${RUN_USER}|g" -e "s|__AI2_DIR__|${APP_DIR}|g" deploy/systemd/ai2.service > "${SERVICE_TMP}"
  $SUDO install -m 0644 "${SERVICE_TMP}" /etc/systemd/system/ai2.service
  rm -f "${SERVICE_TMP}"
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ai2
  $SUDO systemctl restart ai2
fi

if [[ "${WITH_COMFYUI}" -eq 1 ]] && [[ "${ENABLE_SERVICE}" -eq 1 ]] && command -v systemctl >/dev/null 2>&1; then
  echo '==> Installing/enabling ComfyUI systemd service'
  SERVICE_TMP="$(mktemp)"
  sed -e "s|__AI2_USER__|${RUN_USER}|g" -e "s|__AI2_COMFYUI_ROOT__|${COMFYUI_ROOT}|g" deploy/systemd/ai2-comfyui.service > "${SERVICE_TMP}"
  $SUDO install -m 0644 "${SERVICE_TMP}" /etc/systemd/system/ai2-comfyui.service
  rm -f "${SERVICE_TMP}"
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable ai2-comfyui
  $SUDO systemctl restart ai2-comfyui
fi

if [[ "${WITH_NGINX}" -eq 1 ]]; then
  echo '==> Installing Ai2 NGINX reverse proxy'
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
ComfyUI:           $([[ "${WITH_COMFYUI}" -eq 1 ]] && echo "enabled (${COMFYUI_ROOT})" || echo not installed)
Core service:      $([[ "${ENABLE_SERVICE}" -eq 1 ]] && echo enabled || echo disabled)
Ollama:            $([[ "${WITH_OLLAMA}" -eq 1 ]] && echo enabled || echo not installed)
NGINX:             $([[ "${WITH_NGINX}" -eq 1 ]] && echo enabled || echo not installed)

Commands:
  cd "${APP_DIR}"
  npm run doctor
  npm run status
  systemctl status ai2
  $([[ "${WITH_COMFYUI}" -eq 1 ]] && echo 'systemctl status ai2-comfyui')
  journalctl -u ai2 -f

Direct URL: http://127.0.0.1:3000
ComfyUI:    http://127.0.0.1:8188
NGINX URL:  http://127.0.0.1/  (with --with-nginx)
EOF
